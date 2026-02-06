import { neon } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Create a Drizzle ORM instance with driver auto-detection.
 *
 * - **Local (localhost / 127.0.0.1):** Uses `postgres` (postgres.js) for
 *   standard TCP connections to local Supabase Docker.
 * - **Production (Neon/Supabase cloud):** Uses `@neondatabase/serverless`
 *   HTTP driver — ideal for Vercel Edge Runtime (no persistent connections).
 * - **Build-time fallback:** When `DATABASE_URL` is unset, a placeholder
 *   satisfies the constructor without ever being queried.
 *
 * @example
 * // Local:  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54352/postgres"
 * // Prod:   DATABASE_URL="postgresql://...@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
 */
const databaseUrl =
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost/placeholder";

const isLocal =
  databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

/**
 * Typed as `NeonHttpDatabase` since both drivers expose an identical Drizzle
 * query API at runtime. The cast avoids a union type that breaks overload
 * resolution on methods like `.returning()`.
 */
export const db = (
  isLocal
    ? drizzlePg({ client: postgres(databaseUrl), schema })
    : drizzleNeon({ client: neon(databaseUrl), schema })
) as NeonHttpDatabase<typeof schema>;
