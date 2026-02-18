import type { Article } from "@/types/article";
import { cacheGet, cacheSet } from "@/lib/cache";

// ─── GitHub Pull Request API types ────────────────────────────────

/**
 * A single pull request from the GitHub Pulls List API.
 *
 * Note: `review_comments`, `additions`, `deletions` are only
 * available on the individual PR detail endpoint, not the list.
 */
interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  body: string | null;
  comments?: number;
  review_comments?: number;
  additions?: number;
  deletions?: number;
  draft: boolean;
  merged_at: string | null;
  updated_at: string;
  labels: Array<{ name: string; color: string }>;
  user: {
    login: string;
    avatar_url: string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────

const CACHE_KEY = "source:github_prs";

/** Cache duration: 1 hour in seconds. */
const CACHE_TTL = 60 * 60;

/** Maximum retry attempts for rate-limited requests. */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms). */
const BASE_DELAY_MS = 1000;

/** Target repositories to track. */
const REPOS = ["facebook/react", "vercel/next.js"] as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch recent pull requests from facebook/react and vercel/next.js.
 *
 * Fetches both repos in parallel, filters to open or merged PRs
 * (skipping closed-unmerged), and maps to normalized Article objects.
 *
 * @returns Array of up to 20 {@link Article} objects (10 per repo).
 * @throws Never — returns an empty array as a last resort.
 */
export async function fetchGitHubPRs(): Promise<Article[]> {
  // 1. Try cache first
  const cached = await cacheGet<Article[]>(CACHE_KEY);
  if (cached) return cached;

  // 2. Fetch both repos in parallel
  try {
    const results = await Promise.allSettled(
      REPOS.map((repo) => fetchRepoPRs(repo)),
    );

    const articles: Article[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        articles.push(...result.value);
      } else {
        console.error("[GitHub PRs] Repo fetch failed:", result.reason);
      }
    }

    // Write to cache (fire-and-forget)
    if (articles.length > 0) {
      void cacheSet(CACHE_KEY, articles, CACHE_TTL);
    }

    return articles;
  } catch (error) {
    console.error("[GitHub PRs] Fetch failed, trying stale cache:", error);

    // 3. Fallback: re-read cache
    const stale = await cacheGet<Article[]>(CACHE_KEY);
    if (stale) return stale;

    return [];
  }
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Fetch pull requests for a single repository.
 *
 * @param repo - Repository in "owner/name" format.
 * @returns Up to 10 Article objects from the repo's recent PRs.
 */
async function fetchRepoPRs(repo: string): Promise<Article[]> {
  const url = `https://api.github.com/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=10`;
  const prs = await fetchWithRetry<GitHubPR[]>(url);

  // Filter: keep open PRs and merged PRs (skip closed-unmerged)
  const relevant = prs.filter(
    (pr) => pr.state === "open" || pr.merged_at !== null,
  );

  const repoShort = repo.split("/")[1] ?? repo;

  return relevant.map((pr) => ({
    source: "github_prs" as const,
    title: pr.title,
    url: pr.html_url,
    thumbnailUrl: pr.user.avatar_url,
    excerpt: pr.body ? pr.body.slice(0, 200) : undefined,
    score: (pr.comments ?? 0) + (pr.review_comments ?? 0),
    externalId: `pr-${repoShort}-${pr.number}`,
    metadata: {
      repo: repoShort,
      number: pr.number,
      state: pr.merged_at ? ("merged" as const) : ("open" as const),
      author: pr.user.login,
      labels: pr.labels.map((l) => ({ name: l.name, color: l.color })),
      additions: pr.additions ?? 0,
      deletions: pr.deletions ?? 0,
      draft: pr.draft,
      mergedAt: pr.merged_at,
      updatedAt: pr.updated_at,
    },
  }));
}

/**
 * Fetch JSON with exponential backoff retry on HTTP 403/429 (rate limit).
 *
 * Uses GITHUB_TOKEN env var for authenticated requests (5000 req/hr)
 * when available, falling back to unauthenticated (60 req/hr).
 *
 * @param url - GitHub API endpoint URL.
 * @returns Parsed JSON response.
 */
async function fetchWithRetry<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 0 },
    });

    if (res.ok) {
      return res.json() as Promise<T>;
    }

    // Rate-limited — retry with backoff
    if ((res.status === 403 || res.status === 429) && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get("Retry-After");
      const delayMs = retryAfter
        ? Number(retryAfter) * 1000
        : BASE_DELAY_MS * 2 ** attempt;

      console.warn(
        `[GitHub PRs] Rate limited (${res.status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );

      await sleep(delayMs);
      continue;
    }

    throw new Error(`GitHub API responded with ${res.status}`);
  }

  throw new Error("[GitHub PRs] Exhausted all retry attempts");
}

/** Promise-based sleep helper for backoff delays. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
