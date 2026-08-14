import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { hiddenItems } from "@/lib/db/schema";
import type { HiddenStateSnapshot } from "@/lib/personalization/hidden-state-snapshot";

/**
 * Loads hidden filters after HomePage resolves authentication so the read-only query stays outside the Server Action boundary.
 * @param userId - Authenticated user ID supplied by a trusted server caller.
 * @returns Hidden persisted article IDs, source IDs, and topic keywords.
 * @example
 * await getHiddenStateByUserId("e2e-user")
 */
export async function getHiddenStateByUserId(
  userId: string,
): Promise<HiddenStateSnapshot> {
  const rows = await db
    .select({
      targetType: hiddenItems.targetType,
      targetId: hiddenItems.targetId,
    })
    .from(hiddenItems)
    .where(eq(hiddenItems.userId, userId));

  const hiddenArticleIds: string[] = [];
  const hiddenSources: string[] = [];
  const hiddenTopics: string[] = [];

  // Group each persisted filter into the client snapshot expected by personalization state.
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
