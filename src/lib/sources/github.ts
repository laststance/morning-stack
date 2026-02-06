import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── GitHub Search API types ──────────────────────────────────────────

/** A single repository from the GitHub search response. */
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  owner: {
    avatar_url: string;
  };
}

/** Top-level response from `api.github.com/search/repositories`. */
interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepo[];
}

// ─── Constants ───────────────────────────────────────────────────────

const CACHE_KEY = "source:github";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

/** Maximum retry attempts for rate-limited requests. */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms). */
const BASE_DELAY_MS = 1000;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch the top 5 trending GitHub repositories (created in the last 7 days,
 * sorted by stars).
 *
 * 1. Returns cached data if available (1-hour TTL).
 * 2. On cache miss, fetches from GitHub Search API with retry on rate limits.
 * 3. On API failure, falls back to stale cached data if any exists.
 *
 * @returns Array of up to 5 {@link Article} objects from GitHub.
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchGitHubArticles(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch from API with retry
  try {
    const data = await fetchWithRetry(buildSearchUrl());
    const articles = mapReposToArticles(data.items.slice(0, 5));

    // Write to cache (fire-and-forget)
    void cacheSet(CACHE_KEY, articles, CACHE_TTL);

    return articles;
  } catch (error) {
    console.error("[GitHub] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Build the GitHub search URL filtering repos created in the last 7 days,
 * sorted by stars in descending order.
 */
function buildSearchUrl(): string {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const dateStr = since.toISOString().split("T")[0];

  return (
    `https://api.github.com/search/repositories` +
    `?q=created:>${dateStr}` +
    `&sort=stars&order=desc&per_page=5`
  );
}

/**
 * Fetch with exponential backoff retry on HTTP 403/429 (rate limit).
 *
 * GitHub's unauthenticated search API allows 10 requests/minute.
 * On rate limit, the `Retry-After` header (seconds) is honored when
 * present; otherwise we use exponential backoff (1s, 2s, 4s).
 */
async function fetchWithRetry(url: string): Promise<GitHubSearchResponse> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 0 },
    });

    // Success
    if (res.ok) {
      return res.json() as Promise<GitHubSearchResponse>;
    }

    // Rate-limited — retry with backoff
    if ((res.status === 403 || res.status === 429) && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get("Retry-After");
      const delayMs = retryAfter
        ? Number(retryAfter) * 1000
        : BASE_DELAY_MS * 2 ** attempt;

      console.warn(
        `[GitHub] Rate limited (${res.status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );

      await sleep(delayMs);
      continue;
    }

    // Non-retryable error
    throw new Error(`GitHub API responded with ${res.status}`);
  }

  throw new Error("[GitHub] Exhausted all retry attempts");
}

/** Map GitHub search results to normalized {@link Article} objects. */
function mapReposToArticles(repos: GitHubRepo[]): Article[] {
  return repos.map((repo) => ({
    source: "github" as const,
    title: repo.full_name,
    url: repo.html_url,
    thumbnailUrl: repo.owner.avatar_url,
    excerpt: repo.description ?? undefined,
    score: repo.stargazers_count,
    externalId: String(repo.id),
    metadata: {
      name: repo.name,
      stars: repo.stargazers_count,
      language: repo.language,
      description: repo.description,
    },
  }));
}

/** Promise-based sleep helper for backoff delays. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
