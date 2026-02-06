"use server";

import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookmarks, articles } from "@/lib/db/schema";
import type { Article, ArticleSource } from "@/types/article";

/**
 * Add a bookmark for the current user.
 *
 * Looks up the article by `externalId`, then inserts a bookmark row.
 * Returns `{ success: true }` on success, or `{ success: false, error }` on failure.
 * Silently succeeds if the bookmark already exists (idempotent).
 */
export async function addBookmark(
  externalId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const articleRows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.externalId, externalId))
    .limit(1);

  const article = articleRows[0];
  if (!article) {
    return { success: false, error: "Article not found" };
  }

  try {
    await db.insert(bookmarks).values({
      userId: session.user.id,
      articleId: article.id,
    });
  } catch (error: unknown) {
    // Unique constraint violation — bookmark already exists
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { success: true };
    }
    return { success: false, error: "Failed to add bookmark" };
  }

  return { success: true };
}

/**
 * Remove a bookmark for the current user.
 *
 * Looks up the article by `externalId`, then deletes the bookmark row.
 * Silently succeeds if no bookmark exists (idempotent).
 */
export async function removeBookmark(
  externalId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const articleRows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.externalId, externalId))
    .limit(1);

  const article = articleRows[0];
  if (!article) {
    // Article not in DB — nothing to remove
    return { success: true };
  }

  await db
    .delete(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, session.user.id),
        eq(bookmarks.articleId, article.id),
      ),
    );

  return { success: true };
}

/**
 * Get all bookmarked articles for the current user.
 *
 * Returns articles sorted by most recently bookmarked first.
 * Returns empty array if not authenticated.
 */
export async function getBookmarks(): Promise<Article[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const rows = await db
    .select({
      source: articles.source,
      title: articles.title,
      url: articles.url,
      thumbnailUrl: articles.thumbnailUrl,
      excerpt: articles.excerpt,
      score: articles.score,
      externalId: articles.externalId,
      metadata: articles.metadata,
      bookmarkedAt: bookmarks.createdAt,
    })
    .from(bookmarks)
    .innerJoin(articles, eq(bookmarks.articleId, articles.id))
    .where(eq(bookmarks.userId, session.user.id))
    .orderBy(desc(bookmarks.createdAt));

  return rows.map((row) => ({
    source: row.source as ArticleSource,
    title: row.title,
    url: row.url,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    excerpt: row.excerpt ?? undefined,
    score: row.score ?? 0,
    externalId: row.externalId ?? "",
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));
}

/**
 * Get the list of bookmarked article externalIds for the current user.
 *
 * Lighter than `getBookmarks()` — only returns IDs for bookmark state initialization.
 */
export async function getBookmarkedIds(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const rows = await db
    .select({ externalId: articles.externalId })
    .from(bookmarks)
    .innerJoin(articles, eq(bookmarks.articleId, articles.id))
    .where(eq(bookmarks.userId, session.user.id));

  return rows
    .map((row) => row.externalId)
    .filter((id): id is string => id !== null);
}
