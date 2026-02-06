import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── Reddit JSON API types ──────────────────────────────────────────

/** Shape of a single post from Reddit's listing response. */
interface RedditPost {
  id: string;
  title: string;
  url: string;
  permalink: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  thumbnail: string;
  over_18: boolean;
  removed_by_category: string | null;
  selftext: string;
  is_self: boolean;
}

/** A child wrapper containing `kind` and `data`. */
interface RedditChild {
  kind: string;
  data: RedditPost;
}

/** Top-level listing response from Reddit `.json` endpoints. */
interface RedditListingResponse {
  data: {
    children: RedditChild[];
  };
}

// ─── Constants ───────────────────────────────────────────────────────

/**
 * Combined subreddits via `+` syntax — a single request fetches hot
 * posts across all of them, avoiding multiple API calls.
 */
const SUBREDDITS = "programming+webdev+javascript+typescript";

const REDDIT_API_URL = `https://www.reddit.com/r/${SUBREDDITS}/hot.json?limit=25`;

const CACHE_KEY = "source:reddit";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

/** Number of top articles to return after filtering and sorting. */
const TOP_N = 5;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch the top 5 hot posts from r/programming, r/webdev, r/javascript,
 * and r/typescript (combined and sorted by score).
 *
 * 1. Returns cached data if available (1-hour TTL).
 * 2. On cache miss, fetches from Reddit JSON API and caches the result.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * @returns Array of up to 5 {@link Article} objects from Reddit.
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchRedditArticles(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch from API
  try {
    const res = await fetch(REDDIT_API_URL, {
      headers: {
        // Reddit requires a descriptive User-Agent; without one, requests
        // may receive 429 Too Many Requests.
        "User-Agent": "MorningStack/1.0 (news-aggregator)",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Reddit API responded with ${res.status}`);
    }

    const data: RedditListingResponse = await res.json();

    const articles = data.data.children
      .map((child) => child.data)
      .filter(isValidPost)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N)
      .map(mapPostToArticle);

    // Write to cache (fire-and-forget)
    void cacheSet(CACHE_KEY, articles, CACHE_TTL);

    return articles;
  } catch (error) {
    console.error("[Reddit] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Filter out NSFW posts, removed posts, and stickied/pinned entries
 * that are typically mod announcements rather than organic content.
 */
function isValidPost(post: RedditPost): boolean {
  if (post.over_18) return false;
  if (post.removed_by_category) return false;
  if (post.selftext === "[removed]") return false;
  return true;
}

/**
 * Map a Reddit post to the normalized {@link Article} shape.
 *
 * For self-posts (text-only), the URL points to the Reddit discussion
 * thread itself. For link-posts, it points to the external URL.
 */
function mapPostToArticle(post: RedditPost): Article {
  return {
    source: "reddit" as const,
    title: post.title,
    url: post.is_self
      ? `https://www.reddit.com${post.permalink}`
      : post.url,
    thumbnailUrl: isValidThumbnail(post.thumbnail)
      ? post.thumbnail
      : undefined,
    excerpt: post.selftext ? post.selftext.slice(0, 200) : undefined,
    score: post.score,
    externalId: post.id,
    metadata: {
      subreddit: post.subreddit,
      upvotes: post.score,
      comments: post.num_comments,
      author: post.author,
    },
  };
}

/**
 * Reddit's `thumbnail` field can be a URL or one of the sentinel
 * strings `"self"`, `"default"`, `"nsfw"`, `"spoiler"`, or empty.
 * Only actual HTTP(S) URLs are valid thumbnails.
 */
function isValidThumbnail(thumb: string): boolean {
  return thumb.startsWith("http://") || thumb.startsWith("https://");
}
