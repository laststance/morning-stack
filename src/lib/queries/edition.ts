import { and, desc, eq, min } from "drizzle-orm";

import { db } from "@/lib/db";
import { articles, editions, type EditionType } from "@/lib/db/schema";
import {
  getCachedOrPersistedWidgetData,
  type WidgetData,
} from "@/lib/widget-snapshots";
import type { ArticleSource, PersistedArticle } from "@/types/article";

// ─── Types ──────────────────────────────────────────────────────────

/** Resolved edition data ready for the home page. */
export interface EditionData {
  /** Edition database ID. */
  id: string;
  /** Edition type (morning or evening). */
  type: EditionType;
  /** Edition date string (YYYY-MM-DD). */
  date: string;
  /** All articles in this edition, grouped by source. */
  articlesBySource: Map<ArticleSource, PersistedArticle[]>;
  /** Flat list of all articles (for the hero section). */
  allArticles: PersistedArticle[];
}

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
  type: EditionType,
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
      id: articles.id,
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

  const allArticles: PersistedArticle[] = articleRows.map((row) => ({
    id: row.id,
    source: row.source,
    title: row.title,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    excerpt: row.excerpt ?? undefined,
    score: row.score ?? 0,
    externalId: row.externalId ?? "",
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));

  const articlesBySource = new Map<ArticleSource, PersistedArticle[]>();
  for (const article of allArticles) {
    const existing = articlesBySource.get(article.source) ?? [];
    existing.push(article);
    articlesBySource.set(article.source, existing);
  }

  return {
    id: edition.id,
    type: edition.type,
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

  return getEdition(edition.type, edition.date);
}

/**
 * Reads the shared lower date bound used by all archive controls whenever HomePage resolves historical navigation.
 * @returns Earliest published `YYYY-MM-DD` date, or `null` when no published editions exist.
 * @example
 * await getEarliestPublishedEditionDate() // => "2026-06-16"
 */
export async function getEarliestPublishedEditionDate(): Promise<
  string | null
> {
  const rows = await db
    .select({ earliestDate: min(editions.date) })
    .from(editions)
    .where(eq(editions.status, "published"));

  return rows[0]?.earliestDate ?? null;
}

/**
 * Fetch cached widget data (weather and stocks).
 *
 * Reads from the Redis cache key populated by the cron collector.
 * Returns null weather and empty stocks array when cache is empty.
 */
export async function getWidgetData(): Promise<WidgetData> {
  return getCachedOrPersistedWidgetData();
}
