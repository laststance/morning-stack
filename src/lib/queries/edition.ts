import { eq, and, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { editions, articles, hiddenItems } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { cacheGet } from "@/lib/cache";
import type { Article, ArticleSource } from "@/types/article";
import type { WeatherData } from "@/lib/sources/weather";
import type { StockData } from "@/lib/sources/stocks";

// ─── Types ──────────────────────────────────────────────────────────

/** Resolved edition data ready for the home page. */
export interface EditionData {
  /** Edition database ID. */
  id: string;
  /** Edition type (morning or evening). */
  type: "morning" | "evening";
  /** Edition date string (YYYY-MM-DD). */
  date: string;
  /** All articles in this edition, grouped by source. */
  articlesBySource: Map<ArticleSource, Article[]>;
  /** Flat list of all articles (for the hero section). */
  allArticles: Article[];
}

/** Cached widget data shape (matches the cron collection output). */
export interface WidgetData {
  weather: WeatherData | null;
  stocks: StockData[];
}

// ─── Constants ──────────────────────────────────────────────────────

/** Redis key used by the cron collector for widget data. */
const WIDGET_CACHE_KEY = "edition:widgets";

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Fetch the latest published edition for a given type and date.
 *
 * Queries the `editions` table for a published edition matching the
 * requested type and date, then joins all linked articles. Articles
 * are grouped by source into a `Map` for easy distribution to section
 * components.
 *
 * @param type - Edition type: "morning" or "evening".
 * @param date - Date string in YYYY-MM-DD format.
 * @returns Edition data with grouped articles, or `null` if no published edition exists.
 */
export async function getEdition(
  type: "morning" | "evening",
  date: string,
): Promise<EditionData | null> {
  const editionRows = await db
    .select({ id: editions.id, type: editions.type, date: editions.date })
    .from(editions)
    .where(
      and(
        eq(editions.type, type),
        eq(editions.date, date),
        eq(editions.status, "published"),
      ),
    )
    .limit(1);

  const edition = editionRows[0];
  if (!edition) return null;

  const articleRows = await db
    .select({
      source: articles.source,
      title: articles.title,
      url: articles.url,
      thumbnailUrl: articles.thumbnailUrl,
      excerpt: articles.excerpt,
      score: articles.score,
      externalId: articles.externalId,
      metadata: articles.metadata,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(eq(articles.editionId, edition.id))
    .orderBy(desc(articles.score));

  let allArticles: Article[] = articleRows.map((row) => ({
    source: row.source as ArticleSource,
    title: row.title,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    excerpt: row.excerpt ?? undefined,
    score: row.score ?? 0,
    externalId: row.externalId ?? "",
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));

  // Apply server-side hidden item filtering for authenticated users
  allArticles = await applyHiddenFilters(allArticles);

  const articlesBySource = new Map<ArticleSource, Article[]>();
  for (const article of allArticles) {
    const existing = articlesBySource.get(article.source) ?? [];
    existing.push(article);
    articlesBySource.set(article.source, existing);
  }

  return {
    id: edition.id,
    type: edition.type as "morning" | "evening",
    date: edition.date,
    allArticles,
    articlesBySource,
  };
}

/**
 * Fetch the latest published edition regardless of type.
 *
 * Falls back to the most recent published edition when no edition
 * exists for the requested type + date combination. Useful for
 * the initial server render when no specific edition is available yet.
 *
 * @returns Edition data, or `null` if no published editions exist at all.
 */
export async function getLatestEdition(): Promise<EditionData | null> {
  const editionRows = await db
    .select({ id: editions.id, type: editions.type, date: editions.date })
    .from(editions)
    .where(eq(editions.status, "published"))
    .orderBy(desc(editions.publishedAt))
    .limit(1);

  const edition = editionRows[0];
  if (!edition) return null;

  return getEdition(edition.type as "morning" | "evening", edition.date);
}

/**
 * Fetch cached widget data (weather and stocks).
 *
 * Reads from the Redis cache key populated by the cron collector.
 * Returns null weather and empty stocks array when cache is empty.
 */
export async function getWidgetData(): Promise<WidgetData> {
  const cached = await cacheGet<WidgetData>(WIDGET_CACHE_KEY);
  return cached ?? { weather: null, stocks: [] };
}

// ─── Internal Helpers ────────────────────────────────────────────────

/**
 * Filter articles based on the current user's hidden items.
 *
 * Queries the `hidden_items` table for the authenticated user and removes
 * articles matching hidden article IDs, hidden sources, or hidden topics
 * (case-insensitive title substring match).
 *
 * Returns the original list unchanged if no user is authenticated or
 * no hidden items exist.
 */
async function applyHiddenFilters(allArticles: Article[]): Promise<Article[]> {
  const session = await auth();
  if (!session?.user?.id) return allArticles;

  const hiddenRows = await db
    .select({
      targetType: hiddenItems.targetType,
      targetId: hiddenItems.targetId,
    })
    .from(hiddenItems)
    .where(eq(hiddenItems.userId, session.user.id));

  if (hiddenRows.length === 0) return allArticles;

  const hiddenArticleIds = new Set<string>();
  const hiddenSources = new Set<string>();
  const hiddenTopics: string[] = [];

  for (const row of hiddenRows) {
    switch (row.targetType) {
      case "article":
        hiddenArticleIds.add(row.targetId);
        break;
      case "source":
        hiddenSources.add(row.targetId);
        break;
      case "topic":
        hiddenTopics.push(row.targetId.toLowerCase());
        break;
    }
  }

  return allArticles.filter((article) => {
    if (hiddenArticleIds.has(article.externalId)) return false;
    if (hiddenSources.has(article.source)) return false;
    if (hiddenTopics.length > 0) {
      const titleLower = article.title.toLowerCase();
      for (const topic of hiddenTopics) {
        if (titleLower.includes(topic)) return false;
      }
    }
    return true;
  });
}
