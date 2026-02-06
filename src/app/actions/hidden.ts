"use server";

import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hiddenItems } from "@/lib/db/schema";

/** Represents a single hidden-item record returned to the client. */
export interface HiddenItem {
  id: string;
  targetType: "article" | "source" | "topic";
  targetId: string;
  createdAt: string;
}

/**
 * Hide an item for the current user.
 *
 * Supports three target types:
 * - `article`: hides a single article by its `externalId`.
 * - `source`: hides all articles from a given source (e.g. "hackernews").
 * - `topic`: hides articles matching a keyword/topic.
 *
 * Idempotent — silently succeeds if the item is already hidden.
 */
export async function hideItem(
  targetType: "article" | "source" | "topic",
  targetId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if already hidden (idempotent)
  const existing = await db
    .select({ id: hiddenItems.id })
    .from(hiddenItems)
    .where(
      and(
        eq(hiddenItems.userId, session.user.id),
        eq(hiddenItems.targetType, targetType),
        eq(hiddenItems.targetId, targetId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return { success: true };
  }

  await db.insert(hiddenItems).values({
    userId: session.user.id,
    targetType,
    targetId,
  });

  return { success: true };
}

/**
 * Unhide an item for the current user.
 *
 * Silently succeeds if the item is not hidden (idempotent).
 */
export async function unhideItem(
  targetType: "article" | "source" | "topic",
  targetId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  await db
    .delete(hiddenItems)
    .where(
      and(
        eq(hiddenItems.userId, session.user.id),
        eq(hiddenItems.targetType, targetType),
        eq(hiddenItems.targetId, targetId),
      ),
    );

  return { success: true };
}

/**
 * Get all hidden items for the current user.
 *
 * Returns an array of hidden items sorted by most recently hidden.
 * Returns empty array if not authenticated.
 */
export async function getHiddenItems(): Promise<HiddenItem[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const rows = await db
    .select({
      id: hiddenItems.id,
      targetType: hiddenItems.targetType,
      targetId: hiddenItems.targetId,
      createdAt: hiddenItems.createdAt,
    })
    .from(hiddenItems)
    .where(eq(hiddenItems.userId, session.user.id))
    .orderBy(hiddenItems.createdAt);

  return rows.map((row) => ({
    id: row.id,
    targetType: row.targetType as "article" | "source" | "topic",
    targetId: row.targetId,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Get hidden item IDs grouped by type for the current user.
 *
 * Lighter than `getHiddenItems()` — returns only the targetIds grouped
 * by type, for initializing client-side filtering state.
 */
export async function getHiddenState(): Promise<{
  hiddenArticleIds: string[];
  hiddenSources: string[];
  hiddenTopics: string[];
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { hiddenArticleIds: [], hiddenSources: [], hiddenTopics: [] };
  }

  const rows = await db
    .select({
      targetType: hiddenItems.targetType,
      targetId: hiddenItems.targetId,
    })
    .from(hiddenItems)
    .where(eq(hiddenItems.userId, session.user.id));

  const hiddenArticleIds: string[] = [];
  const hiddenSources: string[] = [];
  const hiddenTopics: string[] = [];

  for (const row of rows) {
    switch (row.targetType) {
      case "article":
        hiddenArticleIds.push(row.targetId);
        break;
      case "source":
        hiddenSources.push(row.targetId);
        break;
      case "topic":
        hiddenTopics.push(row.targetId);
        break;
    }
  }

  return { hiddenArticleIds, hiddenSources, hiddenTopics };
}
