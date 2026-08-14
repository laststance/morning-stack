import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres, { type Sql } from "postgres";

const EXPECTED_DATABASE_NAME = "morning_stack_e2e";
const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost"]);
const MIGRATION_BREAKPOINT = "--> statement-breakpoint";
const E2E_USER_ID = "e2e-user";
const E2E_SESSION_TOKEN = "e2e-session-token";

test("database setup produces one deterministic archive and one claim per edition", async () => {
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
    await seedArchive(sql);
    const concurrentClaims = await Promise.all([
      claimEdition(sql, "2030-01-20"),
      claimEdition(sql, "2030-01-20"),
    ]);
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
    expect(concurrentClaims.flat()).toHaveLength(1);
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
    insert into articles (id, edition_id, source, title, url, excerpt, score, external_id, metadata)
    values
      ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'hackernews', 'Current shared story', 'https://example.com/current-shared', 'Current edition article', 99, 'shared-external-id', ${sql.json({ comments: 41, author: "current", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'github', 'laststance/current-repository', 'https://github.com/laststance/current-repository', 'Current GitHub article', 90, 'current-github', ${sql.json({ stars: 2030, language: "TypeScript", createdAt: "2030-01-15T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'hackernews', 'Historical shared story', 'https://example.com/historical-shared', 'Historical edition article', 98, 'shared-external-id', ${sql.json({ comments: 14, author: "historical", createdAt: "2030-01-14T00:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'tech_rss', 'Current evening story', 'https://example.com/current-evening', 'Evening edition article', 88, 'current-evening', ${sql.json({ sourceName: "E2E Tech", createdAt: "2030-01-15T08:00:00.000Z" })}),
      ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000004', 'reddit', 'Earliest archive story', 'https://example.com/earliest', 'Archive boundary article', 80, 'earliest-story', ${sql.json({ subreddit: "programming", upvotes: 120, createdAt: "2030-01-12T00:00:00.000Z" })})
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
