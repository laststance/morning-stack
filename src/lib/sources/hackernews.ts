import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── HN Algolia API types ────────────────────────────────────────────

/** Shape of a single hit returned by the HN Algolia search endpoint. */
interface HNAlgoliaHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  num_comments: number;
  author: string;
  story_text: string | null;
}

/** Top-level response from `hn.algolia.com/api/v1/search`. */
interface HNAlgoliaResponse {
  hits: HNAlgoliaHit[];
}

// ─── Constants ───────────────────────────────────────────────────────

const HN_API_URL =
  "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=5";

const CACHE_KEY = "source:hackernews";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch the top 5 front-page HackerNews stories.
 *
 * 1. Returns cached data if available (1-hour TTL).
 * 2. On cache miss, fetches from the HN Algolia API and caches the result.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * @returns Array of up to 5 {@link Article} objects from HackerNews.
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchHackerNewsArticles(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch from API
  try {
    const res = await fetch(HN_API_URL, { next: { revalidate: 0 } });

    if (!res.ok) {
      throw new Error(`HN API responded with ${res.status}`);
    }

    const data: HNAlgoliaResponse = await res.json();
    const articles = mapHitsToArticles(data.hits);

    // Write to cache (fire-and-forget — don't block the response)
    void cacheSet(CACHE_KEY, articles, CACHE_TTL);

    return articles;
  } catch (error) {
    console.error("[HackerNews] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache in case it was populated by a prior request
    //    but expired between our initial check and now (unlikely but safe).
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Map HN Algolia API hits to the normalized {@link Article} shape.
 *
 * Stories without a URL (e.g. "Ask HN" text posts) fall back to the
 * HN item permalink.
 */
function mapHitsToArticles(hits: HNAlgoliaHit[]): Article[] {
  return hits.map((hit) => ({
    source: "hackernews" as const,
    title: hit.title,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    score: hit.points,
    externalId: hit.objectID,
    excerpt: hit.story_text ?? undefined,
    metadata: {
      comments: hit.num_comments,
      author: hit.author,
    },
  }));
}
