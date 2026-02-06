"use client";

import { ContentSection } from "@/components/sections/content-section";
import type { Article, HideAction } from "@/types/article";

export interface HackerNewsSectionProps {
  /** Hacker News articles to display. */
  articles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
  bookmarkedIds?: Set<string>;
}

/**
 * Hacker News section displaying top front-page stories.
 */
export function HackerNewsSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds,
}: HackerNewsSectionProps) {
  return (
    <ContentSection
      icon="🔶"
      title="Hacker News"
      articles={articles}
      onBookmark={onBookmark}
      onHide={onHide}
      bookmarkedIds={bookmarkedIds}
    />
  );
}
