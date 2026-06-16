import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { editions, articles } from "@/lib/db/schema";
import type { Article, ArticleSource } from "@/types/article";
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

/** Edition type produced by the twice-daily collector. */
export type EditionType = "morning" | "evening";

/** Result of fetching from a single source. */
interface SourceResult {
  source: string;
  status: "success" | "failure";
  count: number;
  error?: string;
}

/** Options used to force a specific edition for scheduled cron routes. */
interface CollectRequestOptions {
  editionType?: EditionType;
}

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
 * native scores into a 0-100 normalized range. Scores above the max
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

/**
 * Convert a route segment into an edition type for split Vercel cron paths.
 * @param value - Dynamic route segment from `/api/cron/collect/[edition]`.
 * @returns The matching edition type, or `null` for unsupported segments.
 * @example
 * resolveEditionTypeSegment("morning");
 */
export function resolveEditionTypeSegment(value: string): EditionType | null {
  if (value === "morning" || value === "evening") return value;
  return null;
}

/**
 * Run the edition collector and return an HTTP response for cron route handlers.
 * @param request - Incoming route-handler request with optional cron auth header.
 * @param options - Optional fixed edition type used by scheduled cron routes.
 * @returns JSON response describing the collection result.
 * @example
 * export const GET = (request: Request) => handleCollectRequest(request);
 */
export async function handleCollectRequest(
  request: Request,
  options: CollectRequestOptions = {},
) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const sourceResults: SourceResult[] = [];

  try {
    const editionType = options.editionType ?? determineEditionType();
    const today = getTodayDateString();

    console.log(
      `[Cron] Starting ${editionType} edition collection for ${today}`,
    );

    const existingEdition = await findExistingEdition(editionType, today);
    if (existingEdition?.status === "published") {
      console.log(
        `[Cron] ${editionType} edition for ${today} already published (${existingEdition.id}), skipping`,
      );
      return NextResponse.json({
        status: "skipped",
        reason: "Edition already published",
        editionId: existingEdition.id,
        editionType,
        date: today,
      });
    }

    const edition = await getWritableDraftEdition(existingEdition, {
      editionType,
      today,
    });

    const {
      allArticles,
      sourceResults: articleSourceResults,
      weatherData,
      stockData,
    } = await fetchAllSources();
    sourceResults.push(...articleSourceResults);

    if (allArticles.length === 0) {
      throw new Error("No articles collected; leaving edition as draft");
    }

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

    sourceResults.push({
      source: "weather",
      status: weatherData ? "success" : "failure",
      count: weatherData ? 1 : 0,
      error: weatherData ? undefined : "No data",
    });

    sourceResults.push({
      source: "stocks",
      status: stockData.length > 0 ? "success" : "failure",
      count: stockData.length,
      error: stockData.length > 0 ? undefined : "No data",
    });

    await cacheSet(
      WIDGET_CACHE_KEY,
      { weather: weatherData, stocks: stockData },
      WIDGET_CACHE_TTL,
    );

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

/**
 * Check the optional CRON_SECRET header before data collection starts.
 * @param request - Incoming cron route request.
 * @returns Whether the request is allowed to run collection.
 * @example
 * isAuthorizedCronRequest(request);
 */
function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

/**
 * Find any existing edition for the date so failed drafts do not block retries.
 * @param editionType - Morning or evening collection target.
 * @param today - JST date string in YYYY-MM-DD format.
 * @returns Existing edition row, preferring published rows when present.
 * @example
 * const edition = await findExistingEdition("morning", "2026-06-16");
 */
async function findExistingEdition(editionType: EditionType, today: string) {
  const rows = await db
    .select({
      id: editions.id,
      status: editions.status,
    })
    .from(editions)
    .where(and(eq(editions.type, editionType), eq(editions.date, today)));

  return rows.find((row) => row.status === "published") ?? rows[0] ?? null;
}

/**
 * Reuse an unpublished edition or create a fresh draft before source fetches.
 * @param existingEdition - Existing row for the target date, usually a stale draft.
 * @param input - Edition type and date used when creating a new draft.
 * @returns Writable draft edition ID.
 * @example
 * const draft = await getWritableDraftEdition(existing, { editionType, today });
 */
async function getWritableDraftEdition(
  existingEdition: { id: string; status: "draft" | "published" } | null,
  input: { editionType: EditionType; today: string },
) {
  if (existingEdition) {
    // A previous failed run may have left partial articles attached to a draft.
    await db.delete(articles).where(eq(articles.editionId, existingEdition.id));
    console.log(`[Cron] Reusing draft edition: ${existingEdition.id}`);
    return { id: existingEdition.id };
  }

  const [edition] = await db
    .insert(editions)
    .values({
      type: input.editionType,
      date: input.today,
      status: "draft",
    })
    .returning({ id: editions.id });

  console.log(`[Cron] Created draft edition: ${edition.id}`);

  return edition;
}

/**
 * Fetch all external sources in parallel and normalize article source results.
 * @returns Articles, per-source statuses, and widget data ready for persistence.
 * @example
 * const result = await fetchAllSources();
 */
async function fetchAllSources(): Promise<{
  allArticles: Article[];
  sourceResults: SourceResult[];
  weatherData: Awaited<ReturnType<typeof fetchWeather>>;
  stockData: Awaited<ReturnType<typeof fetchStockData>>;
}> {
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
  const sourceResults: SourceResult[] = [];

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
      continue;
    }

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

  return {
    allArticles,
    sourceResults,
    weatherData:
      weatherResult.status === "fulfilled" ? weatherResult.value : null,
    stockData: stockResult.status === "fulfilled" ? stockResult.value : [],
  };
}

/**
 * Determine the edition type based on the current hour in Asia/Tokyo.
 * @returns Morning before 12:00 JST, otherwise evening.
 * @example
 * const editionType = determineEditionType();
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
 * @returns Current JST date string.
 * @example
 * const today = getTodayDateString();
 */
function getTodayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Normalize article scores to a 0-100 scale.
 * @param fetchedArticles - Raw articles from a source fetch function.
 * @param source - The source identifier for looking up score ranges.
 * @returns Articles with scores mapped to 0-100.
 * @example
 * const normalized = normalizeScores(articles, "hackernews");
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
 * @param normalizedArticles - Articles with 0-100 normalized scores.
 * @param n - Maximum number of articles to keep.
 * @returns Up to `n` articles, highest-scored first.
 * @example
 * const topFive = selectTopN(articles, 5);
 */
function selectTopN(normalizedArticles: Article[], n: number): Article[] {
  return [...normalizedArticles].sort((a, b) => b.score - a.score).slice(0, n);
}
