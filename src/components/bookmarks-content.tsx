"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Article } from "@/types/article";
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
  articles: Article[];
}

/**
 * Client-side bookmarks grid with optimistic un-bookmark support.
 *
 * When a user removes a bookmark, the card disappears immediately
 * (optimistic) while the server action runs in the background.
 * On failure, the card reappears.
 */
export function BookmarksContent({ articles }: BookmarksContentProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const bookmarkedIdsArray = useAppSelector(
    (state) => state.bookmarks.bookmarkedIds,
  );
  const initialized = useAppSelector((state) => state.bookmarks.initialized);

  // Track removed article IDs for optimistic removal from this page's list
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Initialize bookmarks from the articles on this page
  useEffect(() => {
    if (!initialized) {
      dispatch(initializeBookmarks(articles.map((a) => a.externalId)));
    }
  }, [dispatch, initialized, articles]);

  const bookmarkedIdsSet = useMemo(
    () => new Set(bookmarkedIdsArray),
    [bookmarkedIdsArray],
  );

  /** Handle un-bookmark with optimistic removal. */
  const handleBookmark = useCallback(
    async (article: Article) => {
      // On the bookmarks page, clicking always removes
      dispatch(toggleBookmark(article.externalId));
      setRemovedIds((prev) => new Set(prev).add(article.externalId));

      const result = await removeBookmark(article.externalId);

      if (!result.success) {
        // Revert on failure
        dispatch(revertBookmark(article.externalId));
        setRemovedIds((prev) => {
          const next = new Set(prev);
          next.delete(article.externalId);
          return next;
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
    (a) => !removedIds.has(a.externalId),
  );

  if (visibleArticles.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-ms-text-primary">
            No bookmarks yet
          </p>
          <p className="mt-1 text-sm text-ms-text-muted">
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
          key={article.externalId}
          article={article}
          onBookmark={handleBookmark}
          isBookmarked={bookmarkedIdsSet.has(article.externalId)}
        />
      ))}
    </div>
  );
}
