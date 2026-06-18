import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const BUILD_ONLY_DATABASE_URL =
  "postgresql://placeholder:placeholder@localhost/placeholder";

/**
 * Create the Drizzle ORM instance used by server routes and actions.
 *
 * - **Local:** The local Supabase URL uses a regular Postgres connection.
 * - **Production:** Supabase pooler URLs need prepared statements disabled.
 * - **Build-time fallback:** The placeholder satisfies construction only.
 *
 * @example
 * // Local:  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54352/postgres"
 * // Prod:   DATABASE_URL="postgresql://...@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.VERCEL === "1") {
  throw new Error("DATABASE_URL is required on Vercel");
}

const resolvedDatabaseUrl = databaseUrl ?? BUILD_ONLY_DATABASE_URL;

const postgresClient = postgres(resolvedDatabaseUrl, {
  // Supabase pooler connections are safest without prepared statements.
  prepare: false,
});

/**
 * Typed once so feature modules share the same schema-aware query surface.
 */
export const db: PostgresJsDatabase<typeof schema> = drizzle(postgresClient, {
  schema,
});

/**
 * Tells optional runtime features whether a real database connection is present.
 * @returns
 * - `true`: Runtime has a non-placeholder DATABASE_URL.
 * - `false`: Local/build fallback is using the construction-only placeholder.
 * @example
 * if (!isRuntimeDatabaseConfigured()) return;
 */
export function isRuntimeDatabaseConfigured(): boolean {
  return Boolean(databaseUrl && databaseUrl !== BUILD_ONLY_DATABASE_URL);
}
