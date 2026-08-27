"use client";

import { ContentSection } from "@/components/sections/content-section";
import type { PersistedArticle, HideAction } from "@/types/article";

export interface RedditSectionProps {
  /** Reddit articles to display. */
  articles: PersistedArticle[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
}

/**
 * Reddit section displaying hot posts from tech subreddits.
 * Sources: r/programming, r/webdev, r/javascript, r/typescript.
 */
export function RedditSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds,
}: RedditSectionProps) {
  return (
    <ContentSection
      title="Reddit"
      articles={articles}
      onBookmark={onBookmark}
      onHide={onHide}
      bookmarkedIds={bookmarkedIds}
    />
  );
}
