"use client";

import { cn } from "@/lib/utils";
import { ArticleCard } from "@/components/cards/article-card";
import { SectionHeader } from "@/components/sections/section-header";
import type { Article, HideAction } from "@/types/article";

export interface ContentSectionProps {
  /** Emoji or icon for the section header. */
  icon: string;
  /** Section title text. */
  title: string;
  /** Articles to display in this section (max 5). */
  articles: Article[];
  /** Optional "View All" link URL. */
  viewAllHref?: string;
  /** Called when the user clicks the bookmark button on any article. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
  bookmarkedIds?: Set<string>;
  /** Extra CSS classes for the root element. */
  className?: string;
}

/**
 * Generic content section layout: header + responsive article grid.
 *
 * Mobile: horizontal scroll (flex-nowrap), cards 72vw wide.
 * Tablet (>=640px): 2-column grid.
 * Desktop (>=1024px): uses parent grid cell.
 *
 * Individual source sections (Tech, GitHub, HN, Reddit) compose
 * this component with their specific icon, title, and articles.
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
}: ContentSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section aria-label={title} className={cn("flex flex-col gap-3", className)}>
      <SectionHeader icon={icon} title={title} viewAllHref={viewAllHref} />

      {/* Mobile: horizontal scroll  |  Tablet+: vertical stack */}
      <div
        className={cn(
          "flex gap-4 overflow-x-auto pb-2 scrollbar-none",
          "sm:flex-col sm:overflow-x-visible sm:pb-0",
        )}
      >
        {articles.slice(0, 5).map((article) => (
          <div
            key={article.externalId}
            className="w-[68vw] shrink-0 sm:w-auto"
          >
            <ArticleCard
              article={article}
              onBookmark={onBookmark}
              onHide={onHide}
              isBookmarked={bookmarkedIds.has(article.externalId)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
