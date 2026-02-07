import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { editions, articles } from "@/lib/db/schema";
import type { Article } from "@/types/article";
import type { ArticleSource } from "@/types/article";
import { fetchHackerNewsArticles } from "@/lib/sources/hackernews";
import { fetchGitHubArticles } from "@/lib/sources/github";
import { fetchRedditArticles } from "@/lib/sources/reddit";
import { fetchRssArticles } from "@/lib/sources/rss";
import { fetchHatenaArticles } from "@/lib/sources/hatena";
import { fetchBlueskyArticles } from "@/lib/sources/bluesky";
import { fetchYouTubeArticles } from "@/lib/sources/youtube";
import { fetchProductHuntArticles } from "@/lib/sources/producthunt";
import { fetchGitHubPRs } from "@/lib/sources/github-prs";
import { fetchWeather } from "@/lib/sources/weather";
import { fetchStockData } from "@/lib/sources/stocks";
import { cacheSet } from "@/lib/cache";

// ─── Types ──────────────────────────────────────────────────────────

/** Result of fetching from a single source. */
interface SourceResult {
  source: string;
  status: "success" | "failure";
  count: number;
  error?: string;
}

/** Edition type based on hour of the day (Asia/Tokyo). */
type EditionType = "morning" | "evening";

// ─── Constants ──────────────────────────────────────────────────────

/** Maximum articles to keep per source in the edition. */
const TOP_N_PER_SOURCE: Record<ArticleSource, number> = {
  hackernews: 5,
  github: 5,
  github_prs: 10,
  reddit: 5,
  tech_rss: 5,
  hatena: 5,
  producthunt: 5,
  bluesky: 3,
  youtube: 3,
  world_news: 5,
};

/**
 * Score normalization ranges per source.
 *
 * Each source uses different engagement metrics at different scales.
 * These represent typical "high engagement" thresholds used to map
 * native scores into a 0–100 normalized range. Scores above the max
 * are clamped to 100.
 */
const SCORE_RANGES: Record<ArticleSource, { min: number; max: number }> = {
  hackernews: { min: 0, max: 500 },
  github: { min: 0, max: 5000 },
  github_prs: { min: 0, max: 100 },
  reddit: { min: 0, max: 5000 },
  tech_rss: { min: 0, max: 100 },
  hatena: { min: 0, max: 500 },
  producthunt: { min: 0, max: 500 },
  bluesky: { min: 0, max: 200 },
  youtube: { min: 0, max: 1_000_000 },
  world_news: { min: 0, max: 100 },
};

/** Cache key for latest edition widget data (weather/stocks). */
const WIDGET_CACHE_KEY = "edition:widgets";

/** Widget cache duration: 30 minutes. */
const WIDGET_CACHE_TTL = 30 * 60;

// ─── Route Handler ──────────────────────────────────────────────────

/**
 * POST /api/cron/collect
 *
 * Automated data collection endpoint invoked by Vercel Cron at
 * 06:00 and 17:00 Asia/Tokyo. Fetches articles from all sources in
 * parallel, normalizes scores, creates an edition record, and saves
 * the top N articles per source to the database.
 *
 * Protected by `CRON_SECRET` to prevent unauthorized invocations.
 */
export async function GET(request: Request) {
  // ── Auth guard ──────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const sourceResults: SourceResult[] = [];

  try {
    // ── Determine edition type ──────────────────────────────────
    const editionType = determineEditionType();
    const today = getTodayDateString();

    console.log(
      `[Cron] Starting ${editionType} edition collection for ${today}`,
    );

    // ── Check for existing edition ──────────────────────────────
    const existing = await db
      .select({ id: editions.id })
      .from(editions)
      .where(and(eq(editions.type, editionType), eq(editions.date, today)))
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `[Cron] ${editionType} edition for ${today} already exists (${existing[0].id}), skipping`,
      );
      return NextResponse.json({
        status: "skipped",
        reason: "Edition already exists",
        editionId: existing[0].id,
      });
    }

    // ── Create draft edition ────────────────────────────────────
    const [edition] = await db
      .insert(editions)
      .values({ type: editionType, date: today, status: "draft" })
      .returning({ id: editions.id });

    console.log(`[Cron] Created draft edition: ${edition.id}`);

    // ── Fetch all sources in parallel ───────────────────────────
    const [
      hnResult,
      ghResult,
      ghPrsResult,
      redditResult,
      rssResult,
      hatenaResult,
      blueskyResult,
      youtubeResult,
      phResult,
      weatherResult,
      stockResult,
    ] = await Promise.allSettled([
      fetchHackerNewsArticles(),
      fetchGitHubArticles(),
      fetchGitHubPRs(),
      fetchRedditArticles(),
      fetchRssArticles(),
      fetchHatenaArticles(),
      fetchBlueskyArticles(),
      fetchYouTubeArticles(),
      fetchProductHuntArticles(),
      fetchWeather(),
      fetchStockData(),
    ]);

    // ── Process article sources ─────────────────────────────────
    const articleSources: Array<{
      name: ArticleSource;
      result: PromiseSettledResult<Article[]>;
    }> = [
      { name: "hackernews", result: hnResult },
      { name: "github", result: ghResult },
      { name: "github_prs", result: ghPrsResult },
      { name: "reddit", result: redditResult },
      { name: "tech_rss", result: rssResult },
      { name: "hatena", result: hatenaResult },
      { name: "bluesky", result: blueskyResult },
      { name: "youtube", result: youtubeResult },
      { name: "producthunt", result: phResult },
    ];

    const allArticles: Article[] = [];

    for (const { name, result } of articleSources) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        const normalized = normalizeScores(result.value, name);
        const topN = selectTopN(normalized, TOP_N_PER_SOURCE[name]);
        allArticles.push(...topN);
        sourceResults.push({
          source: name,
          status: "success",
          count: topN.length,
        });
      } else {
        const errorMsg =
          result.status === "rejected"
            ? String(result.reason)
            : "No articles returned";
        console.error(`[Cron] ${name} failed: ${errorMsg}`);
        sourceResults.push({
          source: name,
          status: "failure",
          count: 0,
          error: errorMsg,
        });
      }
    }

    // ── Save articles to database ───────────────────────────────
    if (allArticles.length > 0) {
      await db.insert(articles).values(
        allArticles.map((article) => ({
          editionId: edition.id,
          source: article.source,
          title: article.title,
          url: article.url,
          thumbnailUrl: article.thumbnailUrl ?? null,
          excerpt: article.excerpt ?? null,
          score: Math.round(article.score),
          externalId: article.externalId,
          metadata: article.metadata,
        })),
      );
    }

    // ── Cache widget data ───────────────────────────────────────
    const weatherData =
      weatherResult.status === "fulfilled" ? weatherResult.value : null;
    const stockData =
      stockResult.status === "fulfilled" ? stockResult.value : [];

    sourceResults.push({
      source: "weather",
      status: weatherData ? "success" : "failure",
      count: weatherData ? 1 : 0,
      error: !weatherData
        ? weatherResult.status === "rejected"
          ? String(weatherResult.reason)
          : "No data"
        : undefined,
    });

    sourceResults.push({
      source: "stocks",
      status: stockData.length > 0 ? "success" : "failure",
      count: stockData.length,
      error:
        stockData.length === 0
          ? stockResult.status === "rejected"
            ? String(stockResult.reason)
            : "No data"
          : undefined,
    });

    void cacheSet(
      WIDGET_CACHE_KEY,
      { weather: weatherData, stocks: stockData },
      WIDGET_CACHE_TTL,
    );

    // ── Mark edition as published ───────────────────────────────
    await db
      .update(editions)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(editions.id, edition.id));

    const elapsed = Date.now() - startTime;

    const summary = {
      status: "success",
      editionId: edition.id,
      editionType,
      date: today,
      articlesCollected: allArticles.length,
      sources: sourceResults,
      elapsedMs: elapsed,
    };

    console.log(`[Cron] Edition published in ${elapsed}ms:`, summary);

    return NextResponse.json(summary);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Cron] Collection failed after ${elapsed}ms:`, error);

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        sources: sourceResults,
        elapsedMs: elapsed,
      },
      { status: 500 },
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Determine the edition type based on the current hour in Asia/Tokyo.
 *
 * - Before 12:00 JST → morning
 * - 12:00 JST and after → evening
 */
function determineEditionType(): EditionType {
  const now = new Date();
  const tokyoHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );

  return tokyoHour < 12 ? "morning" : "evening";
}

/**
 * Get today's date as a YYYY-MM-DD string in Asia/Tokyo timezone.
 */
function getTodayDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Normalize article scores to a 0–100 scale.
 *
 * Uses predefined score ranges per source to map native engagement
 * metrics (points, stars, upvotes, views…) into a comparable scale.
 * Scores above the max threshold are clamped to 100.
 *
 * @param fetchedArticles - Raw articles from a source fetch function.
 * @param source - The source identifier for looking up score ranges.
 * @returns Articles with scores mapped to 0–100.
 */
function normalizeScores(
  fetchedArticles: Article[],
  source: ArticleSource,
): Article[] {
  const range = SCORE_RANGES[source];

  return fetchedArticles.map((article) => ({
    ...article,
    score: Math.round(
      Math.min(
        100,
        Math.max(
          0,
          ((article.score - range.min) / (range.max - range.min)) * 100,
        ),
      ),
    ),
  }));
}

/**
 * Select the top N articles sorted by normalized score (descending).
 *
 * @param normalizedArticles - Articles with 0–100 normalized scores.
 * @param n - Maximum number of articles to keep.
 * @returns Up to `n` articles, highest-scored first.
 */
function selectTopN(normalizedArticles: Article[], n: number): Article[] {
  return [...normalizedArticles].sort((a, b) => b.score - a.score).slice(0, n);
}
