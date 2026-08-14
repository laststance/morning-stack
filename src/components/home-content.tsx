"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  PersistedArticle,
  ArticleSource,
  HideAction,
} from "@/types/article";
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

interface HomeContentBaseProps {
  /** Server-confirmed auth state used before the client session endpoint settles. */
  isSignedIn: boolean;
  /** Whether bookmark/hidden labels are known instead of guessed after an account-query failure. */
  personalizationStatus: "available" | "unavailable";
  /** All articles from the current edition, grouped by source key. */
  articlesBySource: Record<string, PersistedArticle[]>;
  /** Flat list of all articles (for hero section scoring). */
  allArticles: PersistedArticle[];
  /** Initial bookmarked persisted article IDs from server. */
  bookmarkedIds?: string[];
  /** Initial hidden state from server. */
  hiddenState?: {
    hiddenArticleIds: string[];
    hiddenSources: string[];
    hiddenTopics: string[];
  };
}

/** Current briefing content requires live-view widgets. */
interface CurrentHomeContentProps extends HomeContentBaseProps {
  mode: "current";
  weather: WeatherData | null;
  stocks: StockData[];
}

/** Historical briefing content forbids widgets so archives never show current cached values. */
interface HistoricalHomeContentProps extends HomeContentBaseProps {
  mode: "historical";
  weather?: never;
  stocks?: never;
}

/** Home article layout with current-only widget requirements enforced by its mode discriminator. */
export type HomeContentProps =
  | CurrentHomeContentProps
  | HistoricalHomeContentProps;

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Reads one source list whenever a section renders so absent collectors degrade to an empty section.
 * @param map - Serialized source-to-article record from the server.
 * @param source - Section source identifier.
 * @returns Persisted articles for that source, or an empty list.
 * @example
 * getArticles({ hackernews: [] }, "hackernews") // => []
 */
function getArticles(
  map: Record<string, PersistedArticle[]>,
  source: ArticleSource,
): PersistedArticle[] {
  return map[source] ?? [];
}

/**
 * Applies the authenticated hidden snapshot and optimistic additions whenever HomeContent derives visible article lists.
 * @param articles - Persisted edition articles before personalization.
 * @param hiddenArticleIds - Exact database IDs hidden by the user.
 * @param hiddenSources - Source IDs hidden by the user.
 * @param hiddenTopics - Case-insensitive title keywords hidden by the user.
 * @returns Articles that remain visible under all three filter categories.
 * @example
 * filterHiddenArticles([article], new Set([article.id]), new Set(), new Set()) // => []
 */
function filterHiddenArticles(
  articles: PersistedArticle[],
  hiddenArticleIds: Set<string>,
  hiddenSources: Set<string>,
  hiddenTopics: Set<string>,
): PersistedArticle[] {
  if (
    hiddenArticleIds.size === 0 &&
    hiddenSources.size === 0 &&
    hiddenTopics.size === 0
  ) {
    return articles;
  }

  return articles.filter((article) => {
    // Filter by hidden article ID
    if (hiddenArticleIds.has(article.id)) return false;

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
export function HomeContent(props: HomeContentProps) {
  const {
    articlesBySource,
    allArticles,
    isSignedIn,
    bookmarkedIds: initialBookmarkedIds = [],
    hiddenState: initialHiddenState,
  } = props;
  const dispatch = useAppDispatch();
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
  const hiddenInitialized = useAppSelector((state) => state.hidden.initialized);

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
    () =>
      filterHiddenArticles(
        allArticles,
        hiddenArticleIdsSet,
        hiddenSourcesSet,
        hiddenTopicsSet,
      ),
    [allArticles, hiddenArticleIdsSet, hiddenSourcesSet, hiddenTopicsSet],
  );

  const filteredArticlesBySource = useMemo(() => {
    const result: Record<string, PersistedArticle[]> = {};
    for (const [source, articles] of Object.entries(articlesBySource)) {
      result[source] = filterHiddenArticles(
        articles,
        hiddenArticleIdsSet,
        hiddenSourcesSet,
        hiddenTopicsSet,
      );
    }
    return result;
  }, [
    articlesBySource,
    hiddenArticleIdsSet,
    hiddenSourcesSet,
    hiddenTopicsSet,
  ]);
  /**
   * Handle bookmark toggle with optimistic UI.
   * If not logged in, redirect to /login with return URL.
   */
  const handleBookmark = useCallback(
    async (article: PersistedArticle) => {
      if (!isSignedIn) {
        router.push(
          `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
        return;
      }

      const isCurrentlyBookmarked = bookmarkedIdsArray.includes(article.id);

      // Optimistic update
      dispatch(toggleBookmark(article.id));

      // Persist to server
      const result = isCurrentlyBookmarked
        ? await removeBookmark(article.id)
        : await addBookmark(article.id);

      // Revert on failure
      if (!result.success) {
        dispatch(revertBookmark(article.id));
        toast.error(
          isCurrentlyBookmarked
            ? "Couldn't remove bookmark. Try again."
            : "Couldn't save bookmark. Try again.",
        );
      }
    },
    [isSignedIn, router, dispatch, bookmarkedIdsArray],
  );

  /**
   * Handle hide action with optimistic UI.
   * If not logged in, redirect to /login with return URL.
   */
  const handleHide = useCallback(
    async (action: HideAction) => {
      if (!isSignedIn) {
        router.push(
          `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`,
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
        const failureMessage =
          action.type === "article"
            ? "Couldn't hide this article. Try again."
            : action.type === "source"
              ? "Couldn't hide this source. Try again."
              : "Couldn't hide this topic. Try again.";
        toast.error(failureMessage);
      }
    },
    [isSignedIn, router, dispatch],
  );
  const bookmarkAction =
    props.personalizationStatus === "available" ? handleBookmark : undefined;
  const hideAction =
    props.personalizationStatus === "available" ? handleHide : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Hero + Widgets row ──────────────────────────────────── */}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Hero section — 3/4 width on desktop */}
        <div className="min-w-0 lg:flex-[3]">
          <HeroSection
            articles={filteredAllArticles}
            onBookmark={bookmarkAction}
            onHide={hideAction}
            bookmarkedIds={bookmarkedIdsSet}
          />
        </div>

        {/* Widgets sidebar — secondary on mobile, right rail on desktop. */}
        {props.mode === "current" && (
          <aside
            className="flex flex-col gap-3 lg:flex-[1]"
            aria-label="Daily widgets"
          >
            <WeatherWidget data={props.weather} />
            <StockWidget data={props.stocks} />
          </aside>
        )}
      </div>

      {/* ── Tech / GitHub / HN / Reddit — 4-column grid ────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TechSection
          articles={getArticles(filteredArticlesBySource, "tech_rss")}
          onBookmark={bookmarkAction}
          onHide={hideAction}
          bookmarkedIds={bookmarkedIdsSet}
        />
        <GitHubSection
          articles={getArticles(filteredArticlesBySource, "github")}
          onBookmark={bookmarkAction}
          onHide={hideAction}
          bookmarkedIds={bookmarkedIdsSet}
        />
        <HackerNewsSection
          articles={getArticles(filteredArticlesBySource, "hackernews")}
          onBookmark={bookmarkAction}
          onHide={hideAction}
          bookmarkedIds={bookmarkedIdsSet}
        />
        <RedditSection
          articles={getArticles(filteredArticlesBySource, "reddit")}
          onBookmark={bookmarkAction}
          onHide={hideAction}
          bookmarkedIds={bookmarkedIdsSet}
        />
      </div>

      {/* ── SNS section (Bluesky + YouTube) ─────────────────────── */}
      <SnsSection
        blueskyArticles={getArticles(filteredArticlesBySource, "bluesky")}
        youtubeArticles={getArticles(filteredArticlesBySource, "youtube")}
        onBookmark={bookmarkAction}
        onHide={hideAction}
        bookmarkedIds={bookmarkedIdsSet}
      />

      {/* ── GitHub Pull Requests ─────────────────────────────────── */}
      <GitHubPRsSection
        articles={getArticles(filteredArticlesBySource, "github_prs")}
        onBookmark={bookmarkAction}
        onHide={hideAction}
        bookmarkedIds={bookmarkedIdsSet}
      />

      {/* ── Hatena / World News — 3-column grid ─────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HatenaSection
          articles={getArticles(filteredArticlesBySource, "hatena")}
          onBookmark={bookmarkAction}
          onHide={hideAction}
          bookmarkedIds={bookmarkedIdsSet}
        />
        <WorldNewsSection
          articles={getArticles(filteredArticlesBySource, "world_news")}
          onBookmark={bookmarkAction}
          onHide={hideAction}
          bookmarkedIds={bookmarkedIdsSet}
        />
      </div>
    </div>
  );
}
