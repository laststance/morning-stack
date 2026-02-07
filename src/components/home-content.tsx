"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Article, ArticleSource, HideAction } from "@/types/article";
import type { WeatherData } from "@/lib/sources/weather";
import type { StockData } from "@/lib/sources/stocks";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  initializeBookmarks,
  toggleBookmark,
  revertBookmark,
} from "@/lib/features/bookmarks-slice";
import {
  initializeHidden,
  hideArticle,
  revertHideArticle,
  hideSource,
  revertHideSource,
  hideTopic,
  revertHideTopic,
} from "@/lib/features/hidden-slice";
import { addBookmark, removeBookmark } from "@/app/actions/bookmarks";
import { hideItem } from "@/app/actions/hidden";
import { HeroSection } from "@/components/sections/hero-section";
import { WeatherWidget } from "@/components/widgets/weather-widget";
import { StockWidget } from "@/components/widgets/stock-widget";
import { TechSection } from "@/components/sections/tech-section";
import { GitHubSection } from "@/components/sections/github-section";
import { HackerNewsSection } from "@/components/sections/hackernews-section";
import { RedditSection } from "@/components/sections/reddit-section";
import { SnsSection } from "@/components/sections/sns-section";
import { GitHubPRsSection } from "@/components/sections/github-prs-section";
import { HatenaSection } from "@/components/sections/hatena-section";
import { WorldNewsSection } from "@/components/sections/world-news-section";

// ─── Props ──────────────────────────────────────────────────────────

export interface HomeContentProps {
  /** All articles from the current edition, grouped by source key. */
  articlesBySource: Record<string, Article[]>;
  /** Flat list of all articles (for hero section scoring). */
  allArticles: Article[];
  /** Weather widget data. */
  weather: WeatherData | null;
  /** Stock widget data. */
  stocks: StockData[];
  /** Initial bookmarked article externalIds from server. */
  bookmarkedIds?: string[];
  /** Initial hidden state from server. */
  hiddenState?: {
    hiddenArticleIds: string[];
    hiddenSources: string[];
    hiddenTopics: string[];
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Safely get articles for a source from the serialized map. */
function getArticles(
  map: Record<string, Article[]>,
  source: ArticleSource,
): Article[] {
  return map[source] ?? [];
}

/**
 * Filter articles based on hidden state (article IDs, sources, topics).
 * Applies client-side filtering on top of server-side filtering for
 * optimistic UI updates.
 */
function filterHiddenArticles(
  articles: Article[],
  hiddenArticleIds: Set<string>,
  hiddenSources: Set<string>,
  hiddenTopics: Set<string>,
): Article[] {
  if (hiddenArticleIds.size === 0 && hiddenSources.size === 0 && hiddenTopics.size === 0) {
    return articles;
  }

  return articles.filter((article) => {
    // Filter by hidden article ID
    if (hiddenArticleIds.has(article.externalId)) return false;

    // Filter by hidden source
    if (hiddenSources.has(article.source)) return false;

    // Filter by hidden topic (case-insensitive title match)
    if (hiddenTopics.size > 0) {
      const titleLower = article.title.toLowerCase();
      for (const topic of hiddenTopics) {
        if (titleLower.includes(topic.toLowerCase())) return false;
      }
    }

    return true;
  });
}

// ─── Component ──────────────────────────────────────────────────────

/**
 * Client-side home page content displaying all edition sections.
 *
 * Receives pre-fetched data from the server page component and renders
 * the full edition layout: Hero + Widgets → Tech/GitHub/HN/Reddit →
 * SNS → Hatena/World News.
 *
 * Bookmark and hide callbacks use optimistic Redux updates with server
 * action persistence. Unauthenticated users are redirected to /login.
 */
export function HomeContent({
  articlesBySource,
  allArticles,
  weather,
  stocks,
  bookmarkedIds: initialBookmarkedIds = [],
  hiddenState: initialHiddenState,
}: HomeContentProps) {
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const router = useRouter();

  // ── Bookmarks state ──
  const bookmarkedIdsArray = useAppSelector(
    (state) => state.bookmarks.bookmarkedIds,
  );
  const bookmarksInitialized = useAppSelector(
    (state) => state.bookmarks.initialized,
  );

  // ── Hidden state ──
  const hiddenArticleIdsArray = useAppSelector(
    (state) => state.hidden.hiddenArticleIds,
  );
  const hiddenSourcesArray = useAppSelector(
    (state) => state.hidden.hiddenSources,
  );
  const hiddenTopicsArray = useAppSelector(
    (state) => state.hidden.hiddenTopics,
  );
  const hiddenInitialized = useAppSelector(
    (state) => state.hidden.initialized,
  );

  // Initialize bookmarks from server data on first render
  useEffect(() => {
    if (!bookmarksInitialized) {
      dispatch(initializeBookmarks(initialBookmarkedIds));
    }
  }, [dispatch, bookmarksInitialized, initialBookmarkedIds]);

  // Initialize hidden state from server data on first render
  useEffect(() => {
    if (!hiddenInitialized && initialHiddenState) {
      dispatch(initializeHidden(initialHiddenState));
    }
  }, [dispatch, hiddenInitialized, initialHiddenState]);

  // Convert arrays to Sets for O(1) lookup in child components
  const bookmarkedIdsSet = useMemo(
    () => new Set(bookmarkedIdsArray),
    [bookmarkedIdsArray],
  );
  const hiddenArticleIdsSet = useMemo(
    () => new Set(hiddenArticleIdsArray),
    [hiddenArticleIdsArray],
  );
  const hiddenSourcesSet = useMemo(
    () => new Set(hiddenSourcesArray),
    [hiddenSourcesArray],
  );
  const hiddenTopicsSet = useMemo(
    () => new Set(hiddenTopicsArray),
    [hiddenTopicsArray],
  );

  // Apply client-side hidden filtering
  const filteredAllArticles = useMemo(
    () => filterHiddenArticles(allArticles, hiddenArticleIdsSet, hiddenSourcesSet, hiddenTopicsSet),
    [allArticles, hiddenArticleIdsSet, hiddenSourcesSet, hiddenTopicsSet],
  );

  const filteredArticlesBySource = useMemo(() => {
    const result: Record<string, Article[]> = {};
    for (const [source, articles] of Object.entries(articlesBySource)) {
      result[source] = filterHiddenArticles(
        articles,
        hiddenArticleIdsSet,
        hiddenSourcesSet,
        hiddenTopicsSet,
      );
    }
    return result;
  }, [articlesBySource, hiddenArticleIdsSet, hiddenSourcesSet, hiddenTopicsSet]);

  /**
   * Handle bookmark toggle with optimistic UI.
   * If not logged in, redirect to /login with return URL.
   */
  const handleBookmark = useCallback(
    async (article: Article) => {
      if (!session?.user) {
        router.push(
          `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }

      const isCurrentlyBookmarked = bookmarkedIdsArray.includes(
        article.externalId,
      );

      // Optimistic update
      dispatch(toggleBookmark(article.externalId));

      // Persist to server
      const result = isCurrentlyBookmarked
        ? await removeBookmark(article.externalId)
        : await addBookmark(article.externalId);

      // Revert on failure
      if (!result.success) {
        dispatch(revertBookmark(article.externalId));
      }
    },
    [session, router, dispatch, bookmarkedIdsArray],
  );

  /**
   * Handle hide action with optimistic UI.
   * If not logged in, redirect to /login with return URL.
   */
  const handleHide = useCallback(
    async (action: HideAction) => {
      if (!session?.user) {
        router.push(
          `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }

      // Optimistic update
      switch (action.type) {
        case "article":
          dispatch(hideArticle(action.targetId));
          break;
        case "source":
          dispatch(hideSource(action.targetId));
          break;
        case "topic":
          dispatch(hideTopic(action.targetId));
          break;
      }

      // Persist to server
      const result = await hideItem(action.type, action.targetId);

      // Revert on failure
      if (!result.success) {
        switch (action.type) {
          case "article":
            dispatch(revertHideArticle(action.targetId));
            break;
          case "source":
            dispatch(revertHideSource(action.targetId));
            break;
          case "topic":
            dispatch(revertHideTopic(action.targetId));
            break;
        }
      }
    },
    [session, router, dispatch],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Hero + Widgets row ──────────────────────────────────── */}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Hero section — 3/4 width on desktop */}
        <div className="min-w-0 lg:flex-[3]">
          <HeroSection
            articles={filteredAllArticles}
            onBookmark={handleBookmark}
            onHide={handleHide}
            bookmarkedIds={bookmarkedIdsSet}
          />
        </div>

        {/* Widgets sidebar — 1/4 width on desktop, full-width on mobile above hero */}
        <aside
          className="order-first flex flex-col gap-4 lg:order-last lg:flex-[1]"
          aria-label="Daily widgets"
        >
          <WeatherWidget data={weather} />
          <StockWidget data={stocks} />
        </aside>
      </div>

      {/* ── Tech / GitHub / HN / Reddit — 4-column grid ────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TechSection
          articles={getArticles(filteredArticlesBySource, "tech_rss")}
          onBookmark={handleBookmark}
          onHide={handleHide}
          bookmarkedIds={bookmarkedIdsSet}
        />
        <GitHubSection
          articles={getArticles(filteredArticlesBySource, "github")}
          onBookmark={handleBookmark}
          onHide={handleHide}
          bookmarkedIds={bookmarkedIdsSet}
        />
        <HackerNewsSection
          articles={getArticles(filteredArticlesBySource, "hackernews")}
          onBookmark={handleBookmark}
          onHide={handleHide}
          bookmarkedIds={bookmarkedIdsSet}
        />
        <RedditSection
          articles={getArticles(filteredArticlesBySource, "reddit")}
          onBookmark={handleBookmark}
          onHide={handleHide}
          bookmarkedIds={bookmarkedIdsSet}
        />
      </div>

      {/* ── SNS section (Bluesky + YouTube) ─────────────────────── */}
      <SnsSection
        blueskyArticles={getArticles(filteredArticlesBySource, "bluesky")}
        youtubeArticles={getArticles(filteredArticlesBySource, "youtube")}
        onBookmark={handleBookmark}
        onHide={handleHide}
        bookmarkedIds={bookmarkedIdsSet}
      />

      {/* ── GitHub Pull Requests ─────────────────────────────────── */}
      <GitHubPRsSection
        articles={getArticles(filteredArticlesBySource, "github_prs")}
        onBookmark={handleBookmark}
        onHide={handleHide}
        bookmarkedIds={bookmarkedIdsSet}
      />

      {/* ── Hatena / World News — 3-column grid ─────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HatenaSection
          articles={getArticles(filteredArticlesBySource, "hatena")}
          onBookmark={handleBookmark}
          onHide={handleHide}
          bookmarkedIds={bookmarkedIdsSet}
        />
        <WorldNewsSection
          articles={getArticles(filteredArticlesBySource, "world_news")}
          onBookmark={handleBookmark}
          onHide={handleHide}
          bookmarkedIds={bookmarkedIdsSet}
        />
      </div>
    </div>
  );
}
