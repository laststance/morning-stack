"use client";

import { ContentSection } from "@/components/sections/content-section";
import type { Article, HideAction } from "@/types/article";

export interface RedditSectionProps {
  /** Reddit articles to display. */
  articles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
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
      icon="🤖"
      title="Reddit"
      articles={articles}
      onBookmark={onBookmark}
      onHide={onHide}
      bookmarkedIds={bookmarkedIds}
    />
  );
}
