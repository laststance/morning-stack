import { test as base, type Page } from "@playwright/test";
import type { Article } from "../src/types/article";

/**
 * Mock article data for E2E tests.
 *
 * Provides representative articles from each source to verify
 * that all sections render correctly on the home page.
 */
export const MOCK_ARTICLES: Article[] = [
  {
    source: "hackernews",
    title: "Show HN: MorningStack – A news aggregator for developers",
    url: "https://example.com/hn-article",
    thumbnailUrl: undefined,
    excerpt: "A developer-focused news aggregation service",
    score: 95,
    externalId: "hn-1",
    metadata: { comments: 42, author: "testuser", createdAt: new Date().toISOString() },
  },
  {
    source: "github",
    title: "next-stack/awesome-framework",
    url: "https://github.com/next-stack/awesome-framework",
    thumbnailUrl: undefined,
    score: 90,
    externalId: "gh-1",
    metadata: { stars: 1500, language: "TypeScript", createdAt: new Date().toISOString() },
  },
  {
    source: "reddit",
    title: "What's the best state management library in 2026?",
    url: "https://reddit.com/r/webdev/comments/test",
    score: 80,
    externalId: "reddit-1",
    metadata: { subreddit: "webdev", upvotes: 350, createdAt: new Date().toISOString() },
  },
  {
    source: "tech_rss",
    title: "Apple Announces New Developer Tools at WWDC",
    url: "https://example.com/tech-article",
    score: 75,
    externalId: "rss-1",
    metadata: { sourceName: "The Verge", createdAt: new Date().toISOString() },
  },
];

/**
 * Build the articlesBySource Record from a flat article array.
 */
export function buildArticlesBySource(
  articles: Article[],
): Record<string, Article[]> {
  const map: Record<string, Article[]> = {};
  for (const article of articles) {
    if (!map[article.source]) map[article.source] = [];
    map[article.source].push(article);
  }
  return map;
}

export const test = base;

/**
 * Wait for the Next.js app to finish hydrating.
 * Checks that the header is rendered (layout is ready).
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForSelector("header", { timeout: 15_000 });
  await page.waitForTimeout(500);
}

/**
 * Check whether the page is at a mobile viewport width.
 * Mobile breakpoint is <640px (Tailwind `sm:` prefix).
 */
export function isMobileViewport(page: Page): boolean {
  const viewportSize = page.viewportSize();
  return (viewportSize?.width ?? 1280) < 640;
}

/**
 * Open the hamburger menu on mobile viewports.
 * No-op on desktop viewports where the nav is always visible.
 */
export async function openMobileMenu(page: Page): Promise<void> {
  if (isMobileViewport(page)) {
    const hamburger = page.getByLabel("Open menu");
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await page.getByLabel("Mobile navigation").waitFor({ state: "visible" });
    }
  }
}
