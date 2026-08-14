"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useRouter } from "next/navigation";
import type { PersistedArticle } from "@/types/article";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  initializeBookmarks,
  restoreBookmark,
  toggleBookmark,
} from "@/lib/features/bookmarks-slice";
import {
  createBookmarkRemovalRequest,
  createOptimisticBookmarkRemovalState,
  optimisticBookmarkRemovalReducer,
  runBookmarkRemovalRequest,
} from "@/lib/bookmarks/optimistic-removal-state";
import { removeBookmark } from "@/app/actions/bookmarks";
import { ArticleCard } from "@/components/cards/article-card";

export interface BookmarksContentProps {
  /** Bookmarked articles sorted by most recently saved. */
  articles: PersistedArticle[];
}

/**
 * Renders the server-confirmed bookmark grid and applies optimistic removal while each Server Action is pending.
 * @param props - Latest bookmarked articles from the route render.
 * @returns Bookmark cards or the empty-bookmarks recovery state.
 * @example
 * <BookmarksContent articles={articles} />
 */
export function BookmarksContent({ articles }: BookmarksContentProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const bookmarkedIdsArray = useAppSelector(
    (state) => state.bookmarks.bookmarkedIds,
  );

  const [optimisticRemoval, dispatchOptimisticRemoval] = useReducer(
    optimisticBookmarkRemovalReducer,
    articles,
    createOptimisticBookmarkRemovalState,
  );

  // React immediately restarts this render so children never observe removals from an older server snapshot.
  if (optimisticRemoval.articleSnapshot !== articles) {
    dispatchOptimisticRemoval({
      type: "replace-snapshot",
      articleSnapshot: articles,
    });
  }

  // Every server refresh is authoritative, including an empty bookmark list.
  useEffect(() => {
    dispatch(initializeBookmarks(articles.map((article) => article.id)));
  }, [dispatch, articles]);

  // The reducer emits rollback IDs; this Effect synchronizes the external Redux store idempotently.
  useEffect(() => {
    for (const articleId of optimisticRemoval.rollbackArticleIds) {
      dispatch(restoreBookmark(articleId));
    }
  }, [dispatch, optimisticRemoval.rollbackArticleIds]);

  const removedIds = useMemo(
    () => new Set(optimisticRemoval.removedArticleIds),
    [optimisticRemoval.removedArticleIds],
  );
  const rollbackArticleIds = useMemo(
    () => new Set(optimisticRemoval.rollbackArticleIds),
    [optimisticRemoval.rollbackArticleIds],
  );

  const bookmarkedIdsSet = useMemo(
    () => new Set(bookmarkedIdsArray),
    [bookmarkedIdsArray],
  );

  /** Handle un-bookmark with optimistic removal. */
  const handleBookmark = useCallback(
    async (article: PersistedArticle) => {
      const request = createBookmarkRemovalRequest(
        optimisticRemoval,
        article.id,
      );

      // On the bookmarks page, clicking always removes
      dispatchOptimisticRemoval({ type: "start", request });
      dispatch(toggleBookmark(article.id));

      const didRemove = await runBookmarkRemovalRequest(() =>
        removeBookmark(article.id),
      );
      if (!didRemove) {
        dispatchOptimisticRemoval({ type: "fail", request });
        return;
      }

      dispatchOptimisticRemoval({ type: "succeed", request });
      // Refresh the page data from server after successful removal.
      router.refresh();
    },
    [dispatch, optimisticRemoval, router],
  );

  // Filter out optimistically removed articles
  const visibleArticles = articles.filter(
    (article) => !removedIds.has(article.id),
  );

  if (visibleArticles.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <p className="text-ms-text-primary text-lg font-medium">
            No bookmarks yet
          </p>
          <p className="text-ms-text-muted mt-1 text-sm">
            Click the star icon on any article to save it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visibleArticles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onBookmark={handleBookmark}
          isBookmarked={
            bookmarkedIdsSet.has(article.id) ||
            rollbackArticleIds.has(article.id)
          }
        />
      ))}
    </div>
  );
}
