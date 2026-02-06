import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── Bluesky AT Protocol API types ──────────────────────────────────

/** Author view returned inside a Bluesky post. */
interface BskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

/** The `record` object inside a post view (contains post text). */
interface BskyRecord {
  text?: string;
  createdAt?: string;
}

/** A single post view from the searchPosts response. */
interface BskyPostView {
  uri: string;
  cid: string;
  author: BskyAuthor;
  record: BskyRecord;
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  indexedAt: string;
}

/** Top-level response from `app.bsky.feed.searchPosts`. */
interface BskySearchResponse {
  posts: BskyPostView[];
  cursor?: string;
  hitsTotal?: number;
}

// ─── Constants ───────────────────────────────────────────────────────

/**
 * Public Bluesky AppView endpoint — no authentication required.
 * Uses `sort=top` to surface popular posts and `lang=en` for English
 * tech content. The query targets broad tech-related terms.
 */
const BSKY_API_URL =
  "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts";

const SEARCH_QUERY = "tech OR programming OR developer OR software";

const CACHE_KEY = "source:bluesky";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

/** Number of posts to return. */
const POST_LIMIT = 3;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch the top 3 trending Bluesky posts related to tech.
 *
 * 1. Returns cached data if available (1-hour TTL).
 * 2. On cache miss, fetches from the Bluesky public AppView API and caches the result.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * Uses `app.bsky.feed.searchPosts` with `sort=top` to surface the
 * most-engaged-with posts. The public API requires no authentication.
 *
 * @returns Array of up to 3 {@link Article} objects from Bluesky.
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchBlueskyArticles(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch from API
  try {
    const params = new URLSearchParams({
      q: SEARCH_QUERY,
      sort: "top",
      limit: String(POST_LIMIT),
    });

    const res = await fetch(`${BSKY_API_URL}?${params.toString()}`, {
      next: { revalidate: 0 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Bluesky API responded with ${res.status}`);
    }

    const data: BskySearchResponse = await res.json();
    const articles = mapPostsToArticles(data.posts);

    // Write to cache (fire-and-forget — don't block the response)
    void cacheSet(CACHE_KEY, articles, CACHE_TTL);

    return articles;
  } catch (error) {
    console.error("[Bluesky] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache in case it was populated by a prior request
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Extract the record key (rkey) from an AT Protocol URI.
 *
 * AT URIs have the format `at://{did}/{collection}/{rkey}`.
 * The rkey is the last segment and is used to construct the web URL.
 */
function extractRkey(atUri: string): string {
  const segments = atUri.split("/");
  return segments[segments.length - 1];
}

/**
 * Build the web-accessible Bluesky post URL from author handle and AT URI.
 *
 * Format: `https://bsky.app/profile/{handle}/post/{rkey}`
 */
function buildPostUrl(handle: string, atUri: string): string {
  const rkey = extractRkey(atUri);
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

/**
 * Truncate post text to a reasonable excerpt length.
 *
 * Bluesky posts can be up to 300 characters. We cap the excerpt at
 * 200 characters to keep cards concise.
 */
function truncateExcerpt(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Map Bluesky post views to the normalized {@link Article} shape.
 *
 * Uses `likeCount` as the engagement score since it's the most
 * universal metric across platforms. The post URL is constructed
 * from the author handle and the AT URI record key.
 */
function mapPostsToArticles(posts: BskyPostView[]): Article[] {
  return posts.map((post) => {
    const text = post.record.text ?? "";
    const likes = post.likeCount ?? 0;
    const reposts = post.repostCount ?? 0;

    return {
      source: "bluesky" as const,
      title: truncateExcerpt(text, 100),
      url: buildPostUrl(post.author.handle, post.uri),
      thumbnailUrl: post.author.avatar,
      excerpt: truncateExcerpt(text),
      score: likes,
      externalId: post.cid,
      metadata: {
        author: post.author.handle,
        displayName: post.author.displayName ?? post.author.handle,
        likes,
        reposts,
        replies: post.replyCount ?? 0,
      },
    };
  });
}
