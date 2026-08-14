"use client";

import { ContentSection } from "@/components/sections/content-section";
import type { PersistedArticle, HideAction } from "@/types/article";

export interface GitHubSectionProps {
  /** GitHub trending repository articles to display. */
  articles: PersistedArticle[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
}

/**
 * GitHub Trending section displaying popular repositories from the last 7 days.
 */
export function GitHubSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds,
}: GitHubSectionProps) {
  return (
    <ContentSection
      icon="🐙"
      title="GitHub Trending"
      articles={articles}
      onBookmark={onBookmark}
      onHide={onHide}
      bookmarkedIds={bookmarkedIds}
    />
  );
}
