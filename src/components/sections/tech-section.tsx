"use client";

import { ContentSection } from "@/components/sections/content-section";
import type { Article, HideAction } from "@/types/article";

export interface TechSectionProps {
  /** Tech RSS articles to display. */
  articles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
  bookmarkedIds?: Set<string>;
}

/**
 * Tech News section displaying curated tech articles from RSS feeds.
 * Sources: The Verge, Ars Technica, TechCrunch.
 */
export function TechSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds,
}: TechSectionProps) {
  return (
    <ContentSection
      icon="📰"
      title="Tech News"
      articles={articles}
      onBookmark={onBookmark}
      onHide={onHide}
      bookmarkedIds={bookmarkedIds}
    />
  );
}
