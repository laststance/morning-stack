import Parser from "rss-parser";
import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── RSS feed configuration ────────────────────────────────────────

/** A tech news RSS feed to aggregate. */
interface FeedSource {
  /** Human-readable outlet name. */
  name: string;
  /** RSS / Atom feed URL. */
  url: string;
}

/** Feeds we aggregate — ordered by priority for tie-breaking. */
const FEED_SOURCES: FeedSource[] = [
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
];

// ─── Constants ───────────────────────────────────────────────────────

const CACHE_KEY = "source:tech_rss";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

/** Maximum articles to return. */
const MAX_ARTICLES = 5;

/** Per-feed fetch timeout in milliseconds. */
const FETCH_TIMEOUT_MS = 10_000;

// ─── Shared parser instance ─────────────────────────────────────────

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch the top 5 tech news articles from RSS feeds.
 *
 * Aggregates articles from The Verge, Ars Technica, and TechCrunch,
 * then returns the 5 most recent by publish date.
 *
 * 1. Returns cached data if available (1-hour TTL).
 * 2. On cache miss, fetches all feeds in parallel and caches the result.
 * 3. On fetch failure, falls back to stale cached data if any exists.
 *
 * @returns Array of up to 5 {@link Article} objects from tech RSS feeds.
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchRssArticles(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch all feeds in parallel
  try {
    const results = await Promise.allSettled(
      FEED_SOURCES.map((source) => fetchSingleFeed(source)),
    );

    const articles: Article[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        articles.push(...result.value);
      } else {
        console.warn("[RSS] Feed failed:", result.reason);
      }
    }

    if (articles.length === 0) {
      throw new Error("All RSS feeds returned empty results");
    }

    // Sort by publish date (newest first) and take top N
    const sorted = articles
      .sort((a, b) => {
        const dateA = (a.metadata.publishDate as string) ?? "";
        const dateB = (b.metadata.publishDate as string) ?? "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, MAX_ARTICLES);

    // Write to cache (fire-and-forget — don't block the response)
    void cacheSet(CACHE_KEY, sorted, CACHE_TTL);

    return sorted;
  } catch (error) {
    console.error("[RSS] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache in case it was populated by a prior request
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Fetch and parse a single RSS feed, mapping items to {@link Article}.
 *
 * @param source - Feed URL and outlet name.
 * @returns Articles parsed from the feed.
 */
async function fetchSingleFeed(source: FeedSource): Promise<Article[]> {
  const feed = await parser.parseURL(source.url);

  return (feed.items ?? [])
    .filter((item) => item.title && item.link)
    .map((item) => ({
      source: "tech_rss" as const,
      title: item.title!,
      url: item.link!,
      thumbnailUrl: extractThumbnail(item),
      excerpt: item.contentSnippet?.slice(0, 300) ?? item.summary?.slice(0, 300),
      score: 0,
      externalId: item.guid ?? item.link!,
      metadata: {
        sourceName: source.name,
        publishDate: item.isoDate ?? item.pubDate ?? null,
        author: item.creator ?? null,
      },
    }));
}

/**
 * Extract a thumbnail URL from an RSS item's enclosure.
 *
 * Many RSS feeds include images via the `<enclosure>` tag with
 * a MIME type starting with `image/`.
 */
function extractThumbnail(item: Parser.Item): string | undefined {
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }
  return undefined;
}
