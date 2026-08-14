import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { editions, articles, type EditionType } from "@/lib/db/schema";
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
import { saveWidgetSnapshots } from "@/lib/widget-snapshots";
import {
  tryAcquireEditionCollectionLock,
  type EditionCollectionTransaction,
} from "@/lib/cron/try-acquire-edition-collection-lock";

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

/** Unique edition-row claim that prevents simultaneous collectors from writing the same date/type. */
type WritableEditionClaim =
  | { status: "writable"; id: string }
  | { status: "conflict"; id: string };

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

    const publishedEdition = await findPublishedEdition(editionType, today);
    if (publishedEdition) {
      const { weatherData, stockData } = await fetchWidgetSources();
      const widgetResults = getWidgetSourceResults(weatherData, stockData);
      await saveWidgetSnapshots({ weather: weatherData, stocks: stockData });

      console.log(
        `[Cron] ${editionType} edition for ${today} already published (${publishedEdition.id}), skipping`,
      );
      return NextResponse.json({
        status: "skipped",
        reason: "Edition already published",
        editionId: publishedEdition.id,
        editionType,
        date: today,
        widgets: widgetResults,
      });
    }

    // Slow external requests complete before the lock-owning write transaction begins.
    const {
      allArticles,
      sourceResults: articleSourceResults,
      weatherData,
      stockData,
    } = await fetchAllSources();
    sourceResults.push(...articleSourceResults);
    sourceResults.push(...getWidgetSourceResults(weatherData, stockData));

    if (allArticles.length === 0) {
      const elapsed = Date.now() - startTime;
      await saveWidgetSnapshots({ weather: weatherData, stocks: stockData });
      console.warn(`[Cron] No articles collected after ${elapsed}ms, skipping`);
      return NextResponse.json({
        status: "skipped",
        reason: "No articles collected",
        editionType,
        date: today,
        sources: sourceResults,
        elapsedMs: elapsed,
      });
    }

    const response = await db.transaction(async (transaction) => {
      const hasCollectionLock = await tryAcquireEditionCollectionLock(
        transaction,
        editionType,
        today,
      );
      if (!hasCollectionLock) {
        return NextResponse.json({
          status: "skipped",
          reason: "Edition collection already claimed",
          editionType,
          date: today,
        });
      }

      const existingEdition = await findExistingEdition(
        transaction,
        editionType,
        today,
      );
      if (existingEdition?.status === "published") {
        const widgetResults = getWidgetSourceResults(weatherData, stockData);

        console.log(
          `[Cron] ${editionType} edition for ${today} already published (${existingEdition.id}), skipping`,
        );
        return NextResponse.json({
          status: "skipped",
          reason: "Edition already published",
          editionId: existingEdition.id,
          editionType,
          date: today,
          widgets: widgetResults,
        });
      }

      const editionClaim = await getWritableDraftEdition(
        transaction,
        existingEdition,
        { editionType, today },
      );

      // A unique-index conflict remains a final guard if a non-locking writer inserts the same edition.
      if (editionClaim.status === "conflict") {
        return NextResponse.json({
          status: "skipped",
          reason: "Edition collection already claimed",
          editionId: editionClaim.id,
          editionType,
          date: today,
        });
      }

      const edition = { id: editionClaim.id };
      await transaction.insert(articles).values(
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

      await transaction
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
    });

    // Best-effort widget persistence stays outside the edition lock and cannot roll back published articles.
    await saveWidgetSnapshots({ weather: weatherData, stocks: stockData });
    return response;
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
 * Finds an already-published target before external collection so idempotent cron reruns only refresh optional widgets.
 * @param editionType - Morning or evening collection target.
 * @param today - JST date string in YYYY-MM-DD format.
 * @returns The published edition ID, or null when this run may collect articles.
 * @example
 * await findPublishedEdition("morning", "2026-06-16")
 */
async function findPublishedEdition(
  editionType: EditionType,
  today: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: editions.id })
    .from(editions)
    .where(
      and(
        eq(editions.type, editionType),
        eq(editions.date, today),
        eq(editions.status, "published"),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
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
 * @param transaction - Lock-owning transaction used for all edition/article writes.
 * @param editionType - Morning or evening collection target.
 * @param today - JST date string in YYYY-MM-DD format.
 * @returns Existing edition row, preferring published rows when present.
 * @example
 * const edition = await findExistingEdition(transaction, "morning", "2026-06-16");
 */
async function findExistingEdition(
  transaction: EditionCollectionTransaction,
  editionType: EditionType,
  today: string,
) {
  const rows = await transaction
    .select({
      id: editions.id,
      status: editions.status,
    })
    .from(editions)
    .where(and(eq(editions.type, editionType), eq(editions.date, today)));

  return rows.find((row) => row.status === "published") ?? rows[0] ?? null;
}

/**
 * Reuse an unpublished edition or create a fresh draft after source fetches have completed.
 * @param transaction - Lock-owning transaction used for all edition/article writes.
 * @param existingEdition - Existing row for the target date, usually a stale draft.
 * @param input - Edition type and date used when creating a new draft.
 * @returns Writable ownership for this run, or a conflict claim owned by a simultaneous collector.
 * @example
 * const draft = await getWritableDraftEdition(transaction, existing, { editionType, today });
 */
async function getWritableDraftEdition(
  transaction: EditionCollectionTransaction,
  existingEdition: { id: string; status: "draft" | "published" } | null,
  input: { editionType: EditionType; today: string },
): Promise<WritableEditionClaim> {
  if (existingEdition) {
    // A previous failed run may have left partial articles attached to a draft.
    await transaction
      .delete(articles)
      .where(eq(articles.editionId, existingEdition.id));
    console.log(`[Cron] Reusing draft edition: ${existingEdition.id}`);
    return { status: "writable", id: existingEdition.id };
  }

  const insertedEditions = await transaction
    .insert(editions)
    .values({
      type: input.editionType,
      date: input.today,
      status: "draft",
    })
    .onConflictDoNothing({ target: [editions.type, editions.date] })
    .returning({ id: editions.id });
  const insertedEdition = insertedEditions[0];

  if (insertedEdition) {
    console.log(`[Cron] Created draft edition: ${insertedEdition.id}`);
    return { status: "writable", id: insertedEdition.id };
  }

  // Reload the winner after a unique conflict and skip without touching its draft/articles.
  const conflictingEdition = await findExistingEdition(
    transaction,
    input.editionType,
    input.today,
  );
  if (!conflictingEdition) {
    throw new Error("Edition conflict occurred but no winning row was found");
  }

  console.log(
    `[Cron] Concurrent edition claim detected: ${conflictingEdition.id}`,
  );
  return { status: "conflict", id: conflictingEdition.id };
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
 * Fetch only weather and stock widgets for a skipped already-published edition.
 * @returns Current widget source data, using empty values when a source fails.
 * @example
 * const widgets = await fetchWidgetSources();
 */
async function fetchWidgetSources(): Promise<{
  weatherData: Awaited<ReturnType<typeof fetchWeather>>;
  stockData: Awaited<ReturnType<typeof fetchStockData>>;
}> {
  const [weatherResult, stockResult] = await Promise.allSettled([
    fetchWeather(),
    fetchStockData(),
  ]);

  return {
    weatherData:
      weatherResult.status === "fulfilled" ? weatherResult.value : null,
    stockData: stockResult.status === "fulfilled" ? stockResult.value : [],
  };
}

/**
 * Convert widget values into source status entries for cron responses.
 * @param weatherData - Weather snapshot, or null when unavailable.
 * @param stockData - Stock snapshots, or an empty array when unavailable.
 * @returns Source results for weather and stocks.
 * @example
 * getWidgetSourceResults(weatherData, stockData);
 */
function getWidgetSourceResults(
  weatherData: Awaited<ReturnType<typeof fetchWeather>>,
  stockData: Awaited<ReturnType<typeof fetchStockData>>,
): SourceResult[] {
  return [
    {
      source: "weather",
      status: weatherData ? "success" : "failure",
      count: weatherData ? 1 : 0,
      error: weatherData ? undefined : "No data",
    },
    {
      source: "stocks",
      status: stockData.length > 0 ? "success" : "failure",
      count: stockData.length,
      error: stockData.length > 0 ? undefined : "No data",
    },
  ];
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
