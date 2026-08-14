"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersistedArticle } from "@/types/article";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  initializeBookmarks,
  toggleBookmark,
  revertBookmark,
} from "@/lib/features/bookmarks-slice";
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

  // Track removed article IDs for optimistic removal from this page's list
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Every server refresh is authoritative, including an empty bookmark list.
  useEffect(() => {
    dispatch(initializeBookmarks(articles.map((article) => article.id)));
  }, [dispatch, articles]);

  const bookmarkedIdsSet = useMemo(
    () => new Set(bookmarkedIdsArray),
    [bookmarkedIdsArray],
  );

  /** Handle un-bookmark with optimistic removal. */
  const handleBookmark = useCallback(
    async (article: PersistedArticle) => {
      // On the bookmarks page, clicking always removes
      dispatch(toggleBookmark(article.id));
      setRemovedIds((previousIds) => new Set(previousIds).add(article.id));

      const result = await removeBookmark(article.id);

      if (!result.success) {
        // Revert on failure
        dispatch(revertBookmark(article.id));
        setRemovedIds((previousRemovedIds) => {
          const restoredRemovedIds = new Set(previousRemovedIds);
          restoredRemovedIds.delete(article.id);
          return restoredRemovedIds;
        });
      } else {
        // Refresh the page data from server after successful removal
        router.refresh();
      }
    },
    [dispatch, router],
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
          isBookmarked={bookmarkedIdsSet.has(article.id)}
        />
      ))}
    </div>
  );
}
