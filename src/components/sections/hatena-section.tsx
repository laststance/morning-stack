"use client";

import { ContentSection } from "@/components/sections/content-section";
import type { Article, HideAction } from "@/types/article";

export interface HatenaSectionProps {
  /** Hatena Bookmark entries to display (up to 5). */
  articles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
  bookmarkedIds?: Set<string>;
}

/**
 * Hatena Bookmark section displaying hot technology entries.
 *
 * Shows up to 5 entries from the Japanese tech community,
 * using the shared ContentSection layout with source-branded cards.
 */
export function HatenaSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds,
}: HatenaSectionProps) {
  return (
    <ContentSection
      icon="📌"
      title="Hatena Bookmark"
      articles={articles}
      onBookmark={onBookmark}
      onHide={onHide}
      bookmarkedIds={bookmarkedIds}
    />
  );
}
