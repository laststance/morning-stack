"use client";

import { ContentSection } from "@/components/sections/content-section";
import type { Article, HideAction } from "@/types/article";

export interface WorldNewsSectionProps {
  /** World news articles to display (up to 5, politics minimized). */
  articles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
  bookmarkedIds?: Set<string>;
}

/**
 * World News section displaying general news articles.
 *
 * Provides a broader perspective beyond tech-only sources.
 * Political content is minimized per PRD — the data layer
 * filters politics before articles reach this component.
 */
export function WorldNewsSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds,
}: WorldNewsSectionProps) {
  return (
    <ContentSection
      icon="🌍"
      title="World News"
      articles={articles}
      onBookmark={onBookmark}
      onHide={onHide}
      bookmarkedIds={bookmarkedIds}
    />
  );
}
