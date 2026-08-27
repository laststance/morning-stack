"use client";

import { cn } from "@/lib/utils";
import { ArticleCard } from "@/components/cards/article-card";
import { SectionHeader } from "@/components/sections/section-header";
import type { PersistedArticle, HideAction } from "@/types/article";

export interface ContentSectionProps {
  /** Emoji or icon for the section header. */
  icon: string;
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
  /** Shows descriptions on the one-card layout and the two promoted cards in a five-card layout. */
  showFeaturedExcerpts?: boolean;
}

/**
 * Renders one full-width editorial source band whose card grid adapts to the available article count.
 * @param props - Source identity, persisted articles, and optional personalization callbacks.
 * @returns Nothing for an empty source, otherwise a headed source band with mobile scrolling and balanced desktop rows.
 * @example
 * <ContentSection icon="📰" title="Tech News" articles={articles} />
 */
export function ContentSection({
  icon,
  title,
  articles,
  viewAllHref,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
  className,
  showFeaturedExcerpts = false,
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
      <SectionHeader icon={icon} title={title} viewAllHref={viewAllHref} />

      {/* Mobile keeps each source compact; wider screens distribute the same cards across a balanced editorial row. */}
      <div
        className={cn(
          "scrollbar-none flex gap-4 overflow-x-auto pb-2",
          "sm:grid sm:overflow-x-visible sm:pb-0",
          articleCount > 1 && "sm:grid-cols-2",
          articleCount === 3 && "lg:grid-cols-3",
          articleCount === 4 && "xl:grid-cols-4",
          articleCount === 5 && "lg:grid-cols-3 xl:grid-cols-6",
        )}
        data-layout="article-grid"
        data-article-count={articleCount}
      >
        {visibleArticles.map((article, articleIndex) => (
          <div
            key={article.id}
            className={cn(
              "w-[68vw] shrink-0 sm:w-auto",
              articleCount === 1 && "w-full",
              articleCount === 5 && "xl:col-span-2",
              // The final two cards share the second row instead of leaving a single orphan card.
              articleCount === 5 && articleIndex >= 3 && "xl:col-span-3",
            )}
          >
            <ArticleCard
              article={article}
              onBookmark={onBookmark}
              onHide={onHide}
              isBookmarked={bookmarkedIds.has(article.id)}
              layout={articleCount === 1 ? "wide" : "vertical"}
              showExcerpt={
                showFeaturedExcerpts &&
                (articleCount === 1 ||
                  (articleCount === 5 && articleIndex >= 3))
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
