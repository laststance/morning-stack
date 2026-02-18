/**
 * Delete today's edition and its articles for re-collection.
 *
 * Usage: npx tsx scripts/delete-today-edition.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local BEFORE any app imports
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/lib/db");
  const { editions, articles } = await import("../src/lib/db/schema");

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const found = await db
    .select({ id: editions.id })
    .from(editions)
    .where(eq(editions.date, today));

  if (found.length === 0) {
    console.log(`No edition found for ${today}`);
    return;
  }

  for (const edition of found) {
    await db.delete(articles).where(eq(articles.editionId, edition.id));
    await db.delete(editions).where(eq(editions.id, edition.id));
    console.log(`Deleted edition ${edition.id} (${today})`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
