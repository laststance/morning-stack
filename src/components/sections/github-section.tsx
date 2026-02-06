"use client";

import { ContentSection } from "@/components/sections/content-section";
import type { Article, HideAction } from "@/types/article";

export interface GitHubSectionProps {
  /** GitHub trending repository articles to display. */
  articles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
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
