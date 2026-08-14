"use server";

import { and, desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { articles, bookmarks } from "@/lib/db/schema";
import type { PersistedArticle } from "@/types/article";

/**
 * Adds a bookmark for the exact persisted article when an authenticated feed action triggers.
 * @param articleId - Postgres primary key of the displayed article row.
 * @returns Success for a new/existing bookmark, otherwise a specific authentication/persistence error.
 * @example
 * await addBookmark("10000000-0000-4000-8000-000000000001")
 */
export async function addBookmark(
  articleId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await db
      .insert(bookmarks)
      .values({ userId: session.user.id, articleId })
      .onConflictDoNothing({
        target: [bookmarks.userId, bookmarks.articleId],
      });
  } catch (error) {
    console.error("[Bookmarks] Failed to add persisted article:", error);
    return { success: false, error: "Failed to add bookmark" };
  }

  return { success: true };
}

/**
 * Removes a bookmark for the exact persisted article when an authenticated feed or bookmark action triggers.
 * @param articleId - Postgres primary key of the displayed article row.
 * @returns Success when deletion is complete/idempotent, otherwise an authentication error.
 * @example
 * await removeBookmark("10000000-0000-4000-8000-000000000001")
 */
export async function removeBookmark(
  articleId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  await db
    .delete(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, session.user.id),
        eq(bookmarks.articleId, articleId),
      ),
    );

  return { success: true };
}

/**
 * Loads an authenticated user's saved article rows when the Bookmarks page renders.
 * @returns Persisted articles newest-bookmark first, or an empty list when signed out.
 * @example
 * const savedArticles = await getBookmarks()
 */
export async function getBookmarks(): Promise<PersistedArticle[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await db
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
    })
    .from(bookmarks)
    .innerJoin(articles, eq(bookmarks.articleId, articles.id))
    .where(eq(bookmarks.userId, session.user.id))
    .orderBy(desc(bookmarks.createdAt));

  return rows.map((row) => ({
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
}

/**
 * Loads bookmark state by persisted article ID when HomePage initializes authenticated personalization.
 * @param userId - Authenticated user ID already resolved once by the route.
 * @returns Exact article primary keys saved by that user.
 * @example
 * await getBookmarkedArticleIdsByUserId("e2e-user")
 */
export async function getBookmarkedArticleIdsByUserId(
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ articleId: bookmarks.articleId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));

  return rows.map((row) => row.articleId);
}

/**
 * Preserves the authenticated server-action API for non-home callers that have not already resolved a session.
 * @returns Persisted article IDs, or an empty list when signed out.
 * @example
 * const bookmarkedIds = await getBookmarkedIds()
 */
export async function getBookmarkedIds(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return getBookmarkedArticleIdsByUserId(session.user.id);
}
