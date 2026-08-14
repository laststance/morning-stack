import { sql } from "drizzle-orm";

import type { db } from "@/lib/db";
import type { EditionType } from "@/lib/db/schema";
import {
  EDITION_COLLECTION_LOCK_HASH_SEED,
  EDITION_COLLECTION_LOCK_NAMESPACE,
} from "@/lib/cron/constants";

/** Drizzle transaction kept open while one collector owns a date/type claim. */
export type EditionCollectionTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

/**
 * Claims one date/type inside the collector transaction so concurrent fresh or stale-draft runs cannot both mutate its articles.
 * @param transaction - Active Drizzle transaction that remains open through edition publication.
 * @param editionType - Morning or evening edition being collected.
 * @param date - JST civil date being collected.
 * @returns `true` for the single lock owner, otherwise `false` without waiting.
 * @example
 * await tryAcquireEditionCollectionLock(transaction, "morning", "2030-01-15") // => true
 */
export async function tryAcquireEditionCollectionLock(
  transaction: EditionCollectionTransaction,
  editionType: EditionType,
  date: string,
): Promise<boolean> {
  const lockKey = `${EDITION_COLLECTION_LOCK_NAMESPACE}:${editionType}:${date}`;
  const lockRows = await transaction.execute<{ acquired: boolean }>(sql`
    select pg_try_advisory_xact_lock(
      hashtextextended(
        ${lockKey},
        ${EDITION_COLLECTION_LOCK_HASH_SEED}
      )
    ) as acquired
  `);

  return lockRows[0]?.acquired ?? false;
}
