import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── YouTube Data API v3 types ──────────────────────────────────────

/** Thumbnail object from the API. */
interface YTThumbnail {
  url: string;
  width?: number;
  height?: number;
}

/** Shape of a single video item from the videos.list endpoint. */
interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
    thumbnails: {
      high?: YTThumbnail;
      medium?: YTThumbnail;
      default?: YTThumbnail;
    };
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string; // ISO 8601 duration, e.g. "PT12M34S"
  };
}

/** Top-level response from `youtube.googleapis.com/youtube/v3/videos`. */
interface YTVideosResponse {
  items: YTVideoItem[];
}

// ─── Constants ───────────────────────────────────────────────────────

const CACHE_KEY = "source:youtube";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

/**
 * YouTube Data API v3 videos.list endpoint.
 *
 * Uses `chart=mostPopular` (1 quota unit) instead of search.list (100 units)
 * to conserve the 10,000 units/day quota. `videoCategoryId=28` filters to
 * Science & Technology.
 */
const YT_API_BASE =
  "https://www.googleapis.com/youtube/v3/videos" +
  "?part=snippet,statistics,contentDetails" +
  "&chart=mostPopular" +
  "&videoCategoryId=28" +
  "&regionCode=US" +
  "&maxResults=3";

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch the top 3 trending YouTube videos in the Science & Technology category.
 *
 * 1. Returns cached data if available (1-hour TTL).
 * 2. On cache miss, fetches from YouTube Data API v3 and caches the result.
 * 3. On API failure (including missing API key), falls back to stale cache.
 *
 * Requires the `YOUTUBE_API_KEY` environment variable. When absent (e.g.
 * during `next build`), the function short-circuits to cache or empty array.
 *
 * @returns Array of up to 3 {@link Article} objects from YouTube.
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchYouTubeArticles(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Guard: API key required
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[YouTube] YOUTUBE_API_KEY not set, skipping fetch");
    return [];
  }

  // 3. Fetch from API
  try {
    const url = `${YT_API_BASE}&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (res.status === 403) {
      const body = await res.text();
      // Quota exceeded responses include "quotaExceeded" in the body
      if (body.includes("quotaExceeded")) {
        console.warn("[YouTube] Daily quota exceeded (10,000 units/day)");
      }
      throw new Error(`YouTube API responded with 403: ${body.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(`YouTube API responded with ${res.status}`);
    }

    const data: YTVideosResponse = await res.json();
    const articles = mapVideosToArticles(data.items);

    // Write to cache (fire-and-forget)
    void cacheSet(CACHE_KEY, articles, CACHE_TTL);

    return articles;
  } catch (error) {
    console.error("[YouTube] Fetch failed, trying stale cache:", error);

    // 4. Fallback: re-read cache
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/** Map YouTube API video items to normalized {@link Article} objects. */
function mapVideosToArticles(items: YTVideoItem[]): Article[] {
  return items.map((item) => ({
    source: "youtube" as const,
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    thumbnailUrl: pickThumbnail(item.snippet.thumbnails),
    excerpt: item.snippet.description.slice(0, 200) || undefined,
    score: Number(item.statistics.viewCount ?? "0"),
    externalId: item.id,
    metadata: {
      channel: item.snippet.channelTitle,
      views: Number(item.statistics.viewCount ?? "0"),
      likes: Number(item.statistics.likeCount ?? "0"),
      comments: Number(item.statistics.commentCount ?? "0"),
      duration: parseIsoDuration(item.contentDetails.duration),
    },
  }));
}

/**
 * Pick the best available thumbnail URL.
 *
 * Prefers `high` (480×360) → `medium` (320×180) → `default` (120×90).
 */
function pickThumbnail(
  thumbnails: YTVideoItem["snippet"]["thumbnails"],
): string | undefined {
  return (
    thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url
  );
}

/**
 * Parse an ISO 8601 duration string into a human-readable format.
 *
 * @example parseIsoDuration("PT1H2M34S") → "1:02:34"
 * @example parseIsoDuration("PT12M5S")   → "12:05"
 * @example parseIsoDuration("PT45S")     → "0:45"
 */
function parseIsoDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;

  const h = Number(match[1] ?? 0);
  const m = Number(match[2] ?? 0);
  const s = Number(match[3] ?? 0);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
