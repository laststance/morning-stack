import Parser from "rss-parser";
import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── Hatena Bookmark RSS custom fields ──────────────────────────────

/** Custom fields extracted from Hatena's RDF feed via rss-parser. */
interface HatenaCustomItem {
  bookmarkcount?: string;
  imageurl?: string;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Hatena Bookmark hot entries RSS for the "IT" (technology) category. */
const HATENA_RSS_URL = "https://b.hatena.ne.jp/hotentry/it.rss";

const CACHE_KEY = "source:hatena";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

/** Maximum articles to return. */
const MAX_ARTICLES = 5;

/** Feed fetch timeout in milliseconds. */
const FETCH_TIMEOUT_MS = 10_000;

// ─── Shared parser instance ─────────────────────────────────────────

/**
 * rss-parser configured to extract Hatena-specific custom fields.
 *
 * The `hatena:bookmarkcount` and `hatena:imageurl` namespaced elements
 * are mapped to `bookmarkcount` and `imageurl` on each item.
 */
const parser: Parser<Record<string, unknown>, HatenaCustomItem> = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    Accept: "application/rss+xml, application/rdf+xml, application/xml, text/xml",
  },
  customFields: {
    item: [
      ["hatena:bookmarkcount", "bookmarkcount"],
      ["hatena:imageurl", "imageurl"],
    ],
  },
});

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch the top 5 hot Hatena Bookmark entries in the technology category.
 *
 * 1. Returns cached data if available (1-hour TTL).
 * 2. On cache miss, fetches from the Hatena hot-entry RSS and caches the result.
 * 3. On fetch failure, falls back to stale cached data if any exists.
 *
 * @returns Array of up to 5 {@link Article} objects from Hatena Bookmark.
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchHatenaArticles(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch from RSS feed
  try {
    const feed = await parser.parseURL(HATENA_RSS_URL);

    const articles = (feed.items ?? [])
      .filter((item) => item.title && item.link)
      .map((item) => mapItemToArticle(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ARTICLES);

    if (articles.length === 0) {
      throw new Error("Hatena RSS feed returned no valid entries");
    }

    // Write to cache (fire-and-forget — don't block the response)
    void cacheSet(CACHE_KEY, articles, CACHE_TTL);

    return articles;
  } catch (error) {
    console.error("[Hatena] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache in case it was populated by a prior request
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Map a single Hatena RSS item to the normalized {@link Article} shape.
 *
 * Uses `hatena:bookmarkcount` as the engagement score and
 * `hatena:imageurl` as the thumbnail.
 */
function mapItemToArticle(
  item: Parser.Item & HatenaCustomItem,
): Article {
  const bookmarkCount = parseInt(item.bookmarkcount ?? "0", 10) || 0;

  return {
    source: "hatena" as const,
    title: item.title!,
    url: item.link!,
    thumbnailUrl: item.imageurl || undefined,
    excerpt: item.contentSnippet?.slice(0, 300) ?? undefined,
    score: bookmarkCount,
    externalId: item.guid ?? item.link!,
    metadata: {
      bookmarkCount,
      category: "technology",
    },
  };
}
