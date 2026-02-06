import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client for serverless-friendly caching.
 *
 * Uses `Redis.fromEnv()` which reads `UPSTASH_REDIS_REST_URL` and
 * `UPSTASH_REDIS_REST_TOKEN` from environment variables automatically.
 * Each operation is a single HTTP request — no persistent connection needed.
 *
 * Falls back to a no-op stub when env vars are missing (e.g. during
 * `next build` in CI) so the build never fails due to missing Redis.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

/**
 * Retrieve a cached value by key.
 *
 * @typeParam T - Expected shape of the cached value.
 * @param key - Redis key to look up.
 * @returns The deserialized value, or `null` if the key doesn't exist
 *          or Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  return redis.get<T>(key);
}

/**
 * Store a value in the cache with a time-to-live.
 *
 * @param key   - Redis key.
 * @param value - Value to store (auto-serialized by Upstash SDK).
 * @param ttl   - Expiration in seconds (e.g. `3600` = 1 hour).
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number,
): Promise<void> {
  if (!redis) return;
  await redis.set(key, value, { ex: ttl });
}
