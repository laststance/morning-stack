import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres, { type Sql } from "postgres";

import { db } from "@/lib/db";
import { getWritableDraftEdition } from "@/lib/cron/edition-collector";
import { tryAcquireEditionCollectionLock } from "@/lib/cron/try-acquire-edition-collection-lock";
import { E2E_CURRENT_SHARED_ARTICLE_URL } from "../fixtures";

const EXPECTED_DATABASE_NAME = "morning_stack_e2e";
const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost"]);
const MIGRATION_BREAKPOINT = "--> statement-breakpoint";
const E2E_USER_ID = "e2e-user";
const E2E_SESSION_TOKEN = "e2e-session-token";

test("database setup collects without the edition index and preserves one claim per edition", async () => {
  // Arrange
  const databaseUrl = getRequiredE2eDatabaseUrl();
  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 4,
    onnotice: () => undefined,
  });

  try {
    // Act
    await rebuildDatabase(sql);
    const missingIndexClaim = await claimEditionWithoutUniqueIndex(sql);
    await seedArchive(sql);
    const concurrentClaims = await Promise.all([
      claimEdition(sql, "2030-01-20"),
      claimEdition(sql, "2030-01-20"),
    ]);
    const existingDraftCollectorClaims =
      await claimExistingDraftCollectionLockConcurrently();
    const repeatedExternalIdArticles = await sql<
      Array<{ id: string; editionDate: string }>
    >`
      select articles.id, editions.date::text as "editionDate"
      from articles
      inner join editions on editions.id = articles.edition_id
      where articles.external_id = 'shared-external-id'
      order by editions.date desc
    `;

    // Assert
    expect(missingIndexClaim).toEqual({ status: "writable", rowCount: 1 });
    expect(concurrentClaims.flat()).toHaveLength(1);
    expect(existingDraftCollectorClaims).toEqual([true, false]);
    expect(repeatedExternalIdArticles).toEqual([
      {
        id: "20000000-0000-4000-8000-000000000001",
        editionDate: "2030-01-15",
      },
      {
        id: "20000000-0000-4000-8000-000000000003",
        editionDate: "2030-01-14",
      },
    ]);
  } finally {
    await sql.end();
  }
});

/**
 * Rejects destructive setup unless Playwright targets the dedicated local/CI database.
 * @returns Validated PostgreSQL URL for the isolated `morning_stack_e2e` database.
 * @example
 * getRequiredE2eDatabaseUrl()
 */
function getRequiredE2eDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E setup");

  const parsedUrl = new URL(databaseUrl);
  const databaseName = parsedUrl.pathname.replace(/^\//, "");
  if (
    !LOCAL_DATABASE_HOSTS.has(parsedUrl.hostname) ||
    databaseName !== EXPECTED_DATABASE_NAME
  ) {
    throw new Error(
      `Refusing E2E reset for ${parsedUrl.hostname}/${databaseName}; expected local ${EXPECTED_DATABASE_NAME}`,
    );
  }

  return databaseUrl;
}

/**
 * Removes the production-missing index long enough to prove the real collector can create one draft, then restores the fixture schema.
 * @param sql - Dedicated PostgreSQL client for index setup, verification, and cleanup.
 * @returns Collector status plus the exact number of inserted target editions.
 * @example
 * await claimEditionWithoutUniqueIndex(sql)
 */
async function claimEditionWithoutUniqueIndex(
  sql: Sql,
): Promise<{ status: "writable" | "conflict"; rowCount: number }> {
  await sql.unsafe('drop index "editions_type_date_idx"');

  try {
    const claim = await db.transaction(async (transaction) => {
      const hasLock = await tryAcquireEditionCollectionLock(
        transaction,
        "morning",
        "2030-01-19",
      );
      if (!hasLock) throw new Error("Expected the isolated collector lock");

      return getWritableDraftEdition(transaction, null, {
        editionType: "morning",
        today: "2030-01-19",
      });
    });
    const [editionCount] = await sql<Array<{ rowCount: number }>>`
      select count(*)::integer as "rowCount"
      from editions
      where type = 'morning' and date = '2030-01-19'
    `;

    return { status: claim.status, rowCount: editionCount?.rowCount ?? 0 };
  } finally {
    await sql`delete from editions where type = 'morning' and date = '2030-01-19'`;
    await sql.unsafe(
      'create unique index "editions_type_date_idx" on "editions" using btree ("type", "date")',
    );
  }
}

/**
 * Rebuilds only the validated E2E public schema before the setup project runs browser dependencies.
 * @param sql - Dedicated PostgreSQL client already validated by database name and host.
 * @returns Resolves after every checked-in migration has run in filename order.
 * @example
 * await rebuildDatabase(sql)
 */
async function rebuildDatabase(sql: Sql): Promise<void> {
  // Standard PostgreSQL lacks Supabase API roles referenced by the checked-in RLS migration.
  await sql.unsafe(`
    do $$
    begin
      create role anon nologin;
    exception when duplicate_object then null;
    end
    $$
  `);
  await sql.unsafe(`
    do $$
    begin
      create role authenticated nologin;
    exception when duplicate_object then null;
    end
    $$
  `);
  await sql.unsafe("drop schema public cascade");
  await sql.unsafe("create schema public");

  const migrationsDirectory = path.resolve("supabase/migrations");
  const migrationNames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  // Each generated breakpoint is a transaction-safe statement boundary.
  for (const migrationName of migrationNames) {
    const migrationSql = await readFile(
      path.join(migrationsDirectory, migrationName),
      "utf8",
    );
    const statements = migrationSql
      .split(MIGRATION_BREAKPOINT)
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) await sql.unsafe(statement);
  }
}

/**
 * Seeds the exact current/history/missing/lower-bound matrix consumed by all dependent browser projects.
 * @param sql - Migrated E2E PostgreSQL client.
 * @returns Resolves after fixed editions, articles, widgets, user, and session are committed.
 * @example
 * await seedArchive(sql)
 */
async function seedArchive(sql: Sql): Promise<void> {
  await sql`
    insert into editions (id, type, date, published_at, status)
    values
      ('10000000-0000-4000-8000-000000000001', 'morning', '2030-01-15', '2030-01-15T06:00:00+09:00', 'published'),
      ('10000000-0000-4000-8000-000000000002', 'evening', '2030-01-15', '2030-01-15T17:00:00+09:00', 'published'),
      ('10000000-0000-4000-8000-000000000003', 'morning', '2030-01-14', '2030-01-14T06:00:00+09:00', 'published'),
      ('10000000-0000-4000-8000-000000000004', 'morning', '2030-01-12', '2030-01-12T06:00:00+09:00', 'published')
  `;
  await sql`
    insert into articles (id, edition_id, source, title, url, thumbnail_url, excerpt, score, external_id, metadata)
    values
      ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'hackernews', 'Current shared story', ${E2E_CURRENT_SHARED_ARTICLE_URL}, null, 'Current edition article', 99, 'shared-external-id', ${sql.json({ comments: 41, author: "current", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000001', 'hackernews', 'Second Hacker News story', 'https://example.com/current-hn-2', null, 'Second ranked Hacker News article', 98, 'current-hn-2', ${sql.json({ comments: 38, author: "second", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000001', 'hackernews', 'Third Hacker News story', 'https://example.com/current-hn-3', null, 'Third ranked Hacker News article', 97, 'current-hn-3', ${sql.json({ comments: 35, author: "third", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000001', 'hackernews', 'Fourth Hacker News story', 'https://example.com/current-hn-4', null, 'Fourth ranked Hacker News article', 96, 'current-hn-4', ${sql.json({ comments: 32, author: "fourth", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001', 'hackernews', 'Fifth Hacker News story', 'https://example.com/current-hn-5', null, 'Fifth ranked Hacker News article', 95, 'current-hn-5', ${sql.json({ comments: 29, author: "fifth", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'github', 'laststance/current-repository', 'https://github.com/laststance/current-repository', '/icons/icon-512.png', 'A focused TypeScript toolkit for assembling fast developer briefings.', 94, 'current-github', ${sql.json({ stars: 2030, language: "TypeScript", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'github', 'laststance/data-pipeline', 'https://github.com/laststance/data-pipeline', '/icons/icon-384.png', 'Composable collectors with resilient caching and typed source adapters.', 93, 'current-github-2', ${sql.json({ stars: 1800, language: "TypeScript", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'github', 'laststance/reader-mode', 'https://github.com/laststance/reader-mode', '/icons/icon-192.png', 'An accessible reading surface for dense engineering news.', 92, 'current-github-3', ${sql.json({ stars: 1600, language: "TypeScript", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'github', 'laststance/source-health', 'https://github.com/laststance/source-health', null, 'Health checks for distributed news collectors.', 91, 'current-github-4', ${sql.json({ stars: 1400, language: "Go", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'github', 'laststance/open-briefing', 'https://github.com/laststance/open-briefing', null, 'Open data formats for portable daily editions.', 90, 'current-github-5', ${sql.json({ stars: 1200, language: "Rust", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'hatena', 'AI時代のニュースリーダーを設計する', 'https://example.com/hatena-reader', '/icons/icon-512.png', '情報密度と読みやすさを両立するための設計ノート。', 89, 'current-hatena-1', ${sql.json({ bookmarks: 240, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'hatena', '開発者向けダッシュボードの余白を考える', 'https://example.com/hatena-spacing', '/icons/icon-384.png', 'カードの大きさと記事量のバランスを検証する。', 88, 'current-hatena-2', ${sql.json({ bookmarks: 180, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'hatena', 'Webのタイポグラフィを整える', 'https://example.com/hatena-type', null, '見出し階層の実践例。', 87, 'current-hatena-3', ${sql.json({ bookmarks: 150, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'hatena', 'レスポンシブ画像の基礎', 'https://example.com/hatena-images', null, '画像配信の基礎。', 86, 'current-hatena-4', ${sql.json({ bookmarks: 120, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'hatena', 'ニュースサイトのアクセシビリティ', 'https://example.com/hatena-a11y', null, '読みやすい構造をつくる。', 85, 'current-hatena-5', ${sql.json({ bookmarks: 100, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', 'youtube', 'Building a calmer engineering news reader', 'https://youtube.com/watch?v=e2e-one', '/icons/icon-512.png', 'A practical editorial layout walkthrough.', 84, 'current-youtube-1', ${sql.json({ views: 120000, channel: "MorningStack Labs", duration: "12:30", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000001', 'youtube', 'CSS grids for variable news feeds', 'https://youtube.com/watch?v=e2e-two', '/icons/icon-384.png', 'Responsive composition patterns.', 83, 'current-youtube-2', ${sql.json({ views: 98000, channel: "Layout Weekly", duration: "08:42", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000001', 'youtube', 'Designing dense interfaces without clutter', 'https://youtube.com/watch?v=e2e-three', '/icons/icon-192.png', 'A visual hierarchy case study.', 82, 'current-youtube-3', ${sql.json({ views: 76000, channel: "Interface Review", duration: "16:05", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000001', 'github_prs', 'Refine editorial grid semantics', 'https://github.com/vercel/next.js/pull/1001', '/icons/icon-192.png', 'Open pull request fixture.', 74, 'current-pr-open-1', ${sql.json({ repo: "next.js", number: 1001, state: "open", author: "grid-author", labels: [{ name: "area: ui", color: "0070f3" }], additions: 48, deletions: 12, draft: false, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000001', 'github_prs', 'Guard compact card focus states', 'https://github.com/facebook/react/pull/1002', '/icons/icon-192.png', 'Second open pull request fixture.', 73, 'current-pr-open-2', ${sql.json({ repo: "react", number: 1002, state: "open", author: "focus-author", labels: [{ name: "accessibility", color: "0ea5e9" }], additions: 31, deletions: 7, draft: true, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000001', 'github_prs', 'Keep action rows inside narrow cards', 'https://github.com/vercel/next.js/pull/1003', '/icons/icon-192.png', 'Third open pull request fixture.', 72, 'current-pr-open-3', ${sql.json({ repo: "next.js", number: 1003, state: "open", author: "touch-author", labels: [], additions: 19, deletions: 3, draft: false, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000001', 'github_prs', 'Merge responsive source bands', 'https://github.com/facebook/react/pull/1004', '/icons/icon-192.png', 'Merged pull request fixture.', 71, 'current-pr-merged-1', ${sql.json({ repo: "react", number: 1004, state: "merged", author: "merge-author", labels: [{ name: "ready", color: "22c55e" }], additions: 64, deletions: 20, draft: false, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000001', 'bluesky', 'A calmer news layout starts with clear hierarchy.', 'https://bsky.app/profile/editorial.example/post/e2e', null, 'A calmer news layout starts with clear hierarchy.', 70, 'current-bluesky-1', ${sql.json({ author: "editorial.example", displayName: "Editorial Systems", likes: 1250, reposts: 320, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000036', '10000000-0000-4000-8000-000000000001', 'bluesky', 'Typography should disappear into a calm reading rhythm.', 'https://bsky.app/profile/type.example/post/e2e', null, 'Typography should disappear into a calm reading rhythm.', 64, 'current-bluesky-2', ${sql.json({ author: "type.example", displayName: "Type Notes", likes: 840, reposts: 140, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000037', '10000000-0000-4000-8000-000000000001', 'bluesky', 'Variable feeds need source-owned composition, predictable keyboard order, and enough breathing room to remain readable even when every collector returns a different amount of text.', 'https://bsky.app/profile/layout.example/post/e2e', null, 'Variable feeds need source-owned composition, predictable keyboard order, and enough breathing room to remain readable even when every collector returns a different amount of text.', 63, 'current-bluesky-3', ${sql.json({ author: "layout.example", displayName: "Layout Field Notes", likes: 620, reposts: 88, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000027', '10000000-0000-4000-8000-000000000001', 'tech_rss', 'Editorial density without visual noise', 'https://example.com/tech-density', null, 'A practical guide to calmer high-density news pages.', 69, 'current-tech-1', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000028', '10000000-0000-4000-8000-000000000001', 'tech_rss', 'Designing source-owned content bands', 'https://example.com/tech-bands', null, 'How editorial sections can adapt independently.', 68, 'current-tech-2', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000001', 'tech_rss', 'Responsive grids for unpredictable feeds', 'https://example.com/tech-grids', null, 'Grid techniques for variable article counts.', 67, 'current-tech-3', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000030', '10000000-0000-4000-8000-000000000001', 'tech_rss', 'Readable typography at news scale', 'https://example.com/tech-type', null, 'Typography choices for scanning and sustained reading.', 66, 'current-tech-4', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000001', 'tech_rss', 'Accessible actions on compact cards', 'https://example.com/tech-actions', null, 'Touch and keyboard actions that fit dense layouts.', 65, 'current-tech-5', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000038', '10000000-0000-4000-8000-000000000001', 'reddit', 'What makes a news grid feel balanced?', 'https://reddit.com/r/webdev/comments/grid-balance', null, 'A discussion about variable card counts.', 60, 'current-reddit-1', ${sql.json({ subreddit: "webdev", upvotes: 510, comments: 72, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000039', '10000000-0000-4000-8000-000000000001', 'reddit', 'Patterns for calm information density', 'https://reddit.com/r/programming/comments/calm-density', null, 'Developers compare editorial layouts.', 59, 'current-reddit-2', ${sql.json({ subreddit: "programming", upvotes: 430, comments: 55, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000040', '10000000-0000-4000-8000-000000000001', 'reddit', 'Keyboard navigation in compact action rows', 'https://reddit.com/r/javascript/comments/keyboard-order', null, 'A practical accessibility thread.', 58, 'current-reddit-3', ${sql.json({ subreddit: "javascript", upvotes: 390, comments: 48, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000001', 'reddit', 'Two-by-two grids still earn their keep', 'https://reddit.com/r/typescript/comments/two-by-two', null, 'Why four cards should not leave an orphan row.', 57, 'current-reddit-4', ${sql.json({ subreddit: "typescript", upvotes: 320, comments: 36, createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'hackernews', 'Historical shared story', 'https://example.com/historical-shared', null, 'Historical edition article', 98, 'shared-external-id', ${sql.json({ comments: 14, author: "historical", createdAt: "2030-01-14T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'tech_rss', 'Current evening story', 'https://example.com/current-evening', null, 'Evening edition article', 88, 'current-evening', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T08:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000002', 'tech_rss', 'Evening supporting story one', 'https://example.com/current-evening-2', null, 'Evening supporting article.', 87, 'current-evening-2', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T08:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000002', 'tech_rss', 'Evening supporting story two', 'https://example.com/current-evening-3', null, 'Evening supporting article.', 86, 'current-evening-3', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T08:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000034', '10000000-0000-4000-8000-000000000002', 'tech_rss', 'Evening supporting story three', 'https://example.com/current-evening-4', null, 'Evening supporting article.', 85, 'current-evening-4', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T08:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000035', '10000000-0000-4000-8000-000000000002', 'tech_rss', 'Evening remaining source story', 'https://example.com/current-evening-5', null, 'The single article left in its source band.', 84, 'current-evening-5', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T08:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000004', 'reddit', 'Earliest archive story', 'https://example.com/earliest', null, 'Archive boundary article', 80, 'earliest-story', ${sql.json({ subreddit: "programming", upvotes: 120, createdAt: "2030-01-12T00:00:00.000Z" })})
  `;
  await sql`
    insert into weather_cache (id, location, data, fetched_at)
    values (
      '30000000-0000-4000-8000-000000000001',
      'Tokyo',
      ${sql.json({
        city: "Tokyo",
        temperatureCelsius: 18,
        condition: "Clear",
        iconCode: "☀️",
        humidity: 45,
        windSpeed: 8,
        forecast: [
          {
            date: "2030-01-15",
            tempMax: 20,
            tempMin: 10,
            condition: "Clear",
            icon: "☀️",
          },
          {
            date: "2030-01-16",
            tempMax: 19,
            tempMin: 9,
            condition: "Cloudy",
            icon: "☁️",
          },
          {
            date: "2030-01-17",
            tempMax: 17,
            tempMin: 8,
            condition: "Rain",
            icon: "🌧️",
          },
        ],
      })},
      '2030-01-15T06:00:00+09:00'
    )
  `;
  await sql`
    insert into stock_cache (id, symbol, data, fetched_at)
    values
      ('40000000-0000-4000-8000-000000000001', '^N225', ${sql.json({ symbol: "^N225", name: "Nikkei 225", price: 40000, changeAmount: 100, changePercent: 0.25, currency: "JPY" })}, '2030-01-15T06:00:00+09:00'),
      ('40000000-0000-4000-8000-000000000002', '^GSPC', ${sql.json({ symbol: "^GSPC", name: "S&P 500", price: 6000, changeAmount: -10, changePercent: -0.17, currency: "USD" })}, '2030-01-15T06:00:00+09:00')
  `;
  await sql`
    insert into users (id, email, email_verified, name, provider)
    values (${E2E_USER_ID}, 'reader@example.com', '2030-01-01T00:00:00Z', 'E2E Reader', 'github')
  `;
  await sql`
    insert into sessions (session_token, user_id, expires)
    values (${E2E_SESSION_TOKEN}, ${E2E_USER_ID}, '2031-01-01T00:00:00Z')
  `;
  await sql`
    insert into bookmarks (id, user_id, article_id)
    values (
      '50000000-0000-4000-8000-000000000001',
      ${E2E_USER_ID},
      '20000000-0000-4000-8000-000000000001'
    )
  `;
}

/**
 * Models the collector's conflict-aware insert so concurrent setup proves the database allows one date/type winner.
 * @param sql - Migrated E2E PostgreSQL client.
 * @param date - Unclaimed civil date shared by both concurrent attempts.
 * @returns Inserted edition IDs; exactly one caller receives one row.
 * @example
 * await Promise.all([claimEdition(sql, "2030-01-20"), claimEdition(sql, "2030-01-20")])
 */
async function claimEdition(
  sql: Sql,
  date: string,
): Promise<Array<{ id: string }>> {
  return sql<Array<{ id: string }>>`
    insert into editions (type, date, status)
    values ('morning', ${date}, 'draft')
    on conflict (type, date) do nothing
    returning id
  `;
}

/**
 * Runs two collector transactions against one existing draft so the production lock proves only one writer can clear/publish it.
 * @returns First/second lock outcomes while their transactions overlap.
 * @example
 * await claimExistingDraftCollectionLockConcurrently() // => [true, false]
 */
async function claimExistingDraftCollectionLockConcurrently(): Promise<
  boolean[]
> {
  let releaseFirstCollector = (): void => undefined;
  let announceFirstLock = (): void => undefined;
  const firstLockAcquired = new Promise<void>((resolve) => {
    announceFirstLock = resolve;
  });
  const firstCollectorCanFinish = new Promise<void>((resolve) => {
    releaseFirstCollector = resolve;
  });
  const firstClaim = db.transaction(async (transaction) => {
    const hasLock = await tryAcquireEditionCollectionLock(
      transaction,
      "morning",
      "2030-01-20",
    );
    announceFirstLock();
    await firstCollectorCanFinish;
    return hasLock;
  });

  await firstLockAcquired;
  let secondClaim = false;
  try {
    secondClaim = await db.transaction((transaction) =>
      tryAcquireEditionCollectionLock(transaction, "morning", "2030-01-20"),
    );
  } finally {
    releaseFirstCollector();
  }

  return [await firstClaim, secondClaim];
}
