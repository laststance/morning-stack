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
 * Renders recent GitHub repositories with descriptions on cards promoted by ContentSection's editorial grid.
 * @param props - Persisted repositories and optional personalization callbacks.
 * @returns A GitHub Trending source band with promoted repository context.
 * @example
 * <GitHubSection articles={articles} />
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
      showFeaturedExcerpts
    />
  );
}
