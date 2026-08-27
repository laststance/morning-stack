"use client";

import { cn } from "@/lib/utils";
import { ArticleCard } from "@/components/cards/article-card";
import { SectionHeader } from "@/components/sections/section-header";
import type { PersistedArticle, HideAction } from "@/types/article";

export interface ContentSectionProps {
  /** Section title text. */
  title: string;
  /** Articles to display in this section (max 5). */
  articles: PersistedArticle[];
  /** Optional "View All" link URL. */
  viewAllHref?: string;
  /** Called when the user clicks the bookmark button on any article. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
  /** Extra CSS classes for the root element. */
  className?: string;
}

/**
 * Renders one stable generic source grid whenever a source does not need a bespoke editorial composition.
 * @param props - Source identity, persisted articles, and optional personalization callbacks.
 * @returns Nothing for an empty source, otherwise a headed one-to-three-column article grid.
 * @example
 * <ContentSection title="Tech News" articles={articles} />
 */
export function ContentSection({
  title,
  articles,
  viewAllHref,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
  className,
}: ContentSectionProps) {
  if (articles.length === 0) return null;

  const visibleArticles = articles.slice(0, 5);
  const articleCount = visibleArticles.length;

  return (
    <section
      aria-label={title}
      data-layout="editorial-band"
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <SectionHeader title={title} viewAllHref={viewAllHref} />

      {/* Generic sources stay in document flow; only the dedicated video rail scrolls horizontally. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          articleCount >= 3 && "lg:grid-cols-3",
        )}
        data-layout="article-grid"
        data-article-count={articleCount}
      >
        {visibleArticles.map((article) => (
          <div key={article.id}>
            <ArticleCard
              article={article}
              onBookmark={onBookmark}
              onHide={onHide}
              isBookmarked={bookmarkedIds.has(article.id)}
              presentation={articleCount === 1 ? "wide" : "standard"}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
