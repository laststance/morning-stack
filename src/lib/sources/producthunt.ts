import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── ProductHunt GraphQL API types ──────────────────────────────────

/** Shape of a single post node from the PH GraphQL response. */
interface PHPost {
  id: string;
  name: string;
  tagline: string;
  votesCount: number;
  url: string;
  thumbnail: { url: string } | null;
  topics: { edges: Array<{ node: { name: string } }> };
}

/** Top-level GraphQL response wrapper. */
interface PHGraphQLResponse {
  data: {
    posts: {
      edges: Array<{ node: PHPost }>;
    };
  };
}

// ─── Constants ───────────────────────────────────────────────────────

const PH_API_URL = "https://api.producthunt.com/v2/api/graphql";

const CACHE_KEY = "source:producthunt";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

/**
 * GraphQL query to fetch today's top 5 products sorted by votes.
 *
 * `postedAfter` uses ISO 8601 format (midnight today) so only
 * products launched today are returned.
 */
const POSTS_QUERY = `
  query TodayTopPosts($postedAfter: DateTime!) {
    posts(first: 5, order: VOTES, postedAfter: $postedAfter) {
      edges {
        node {
          id
          name
          tagline
          votesCount
          url
          thumbnail {
            url
          }
          topics {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    }
  }
`;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch today's top 5 ProductHunt launches.
 *
 * 1. Returns cached data if available (1-hour TTL).
 * 2. On cache miss, queries the PH GraphQL API and caches the result.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * Requires the `PRODUCTHUNT_API_TOKEN` environment variable (Developer Token
 * from the ProductHunt API v2 dashboard). Returns an empty array when the
 * token is missing — same build-time safety pattern as other API-key sources.
 *
 * @returns Array of up to 5 {@link Article} objects from ProductHunt.
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchProductHuntArticles(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Guard: API token required
  const token = process.env.PRODUCTHUNT_API_TOKEN;
  if (!token) {
    console.warn("[ProductHunt] PRODUCTHUNT_API_TOKEN not set, skipping fetch");
    return [];
  }

  // 3. Fetch from GraphQL API
  try {
    const postedAfter = todayMidnightISO();

    const res = await fetch(PH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: POSTS_QUERY,
        variables: { postedAfter },
      }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`ProductHunt API responded with ${res.status}`);
    }

    const json: PHGraphQLResponse = await res.json();
    const articles = mapPostsToArticles(json.data.posts.edges);

    // Write to cache (fire-and-forget — don't block the response)
    void cacheSet(CACHE_KEY, articles, CACHE_TTL);

    return articles;
  } catch (error) {
    console.error("[ProductHunt] Fetch failed, trying stale cache:", error);

    // 4. Fallback: re-read cache in case it was populated by a prior request
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Map ProductHunt GraphQL post edges to the normalized {@link Article} shape.
 */
function mapPostsToArticles(
  edges: Array<{ node: PHPost }>,
): Article[] {
  return edges.map(({ node }) => ({
    source: "producthunt" as const,
    title: node.name,
    url: node.url,
    thumbnailUrl: node.thumbnail?.url ?? undefined,
    excerpt: node.tagline,
    score: node.votesCount,
    externalId: node.id,
    metadata: {
      votes: node.votesCount,
      tagline: node.tagline,
      topics: node.topics.edges.map((e) => e.node.name),
    },
  }));
}

/**
 * Return an ISO 8601 timestamp for midnight today (UTC).
 *
 * Used as the `postedAfter` variable so the GraphQL query
 * only returns products launched today.
 */
function todayMidnightISO(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}
