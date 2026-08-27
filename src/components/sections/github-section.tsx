"use client";

import { ArticleCard } from "@/components/cards/article-card";
import { SectionHeader } from "@/components/sections/section-header";
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
 * Renders GitHub repositories as three descriptive media cards followed by compact repository headlines.
 * @param props - Persisted repositories and optional personalization callbacks.
 * @returns Nothing for an empty source, otherwise a GitHub-specific editorial composition.
 * @example
 * <GitHubSection articles={articles} />
 */
export function GitHubSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
}: GitHubSectionProps) {
  if (articles.length === 0) return null;

  const visibleArticles = articles.slice(0, 5);
  const featuredArticles = visibleArticles.slice(0, 3);
  const compactArticles = visibleArticles.slice(3);

  return (
    <section
      aria-label="GitHub Trending"
      className="flex min-w-0 flex-col gap-3"
      data-layout="editorial-band"
    >
      <SectionHeader title="GitHub Trending" />

      {/* Repository descriptions earn the larger first row; overflow becomes dense headline rows. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {featuredArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            presentation="media-three-column"
            showExcerpt
            imageLoading="eager"
            onBookmark={onBookmark}
            onHide={onHide}
            isBookmarked={bookmarkedIds.has(article.id)}
          />
        ))}
      </div>

      {compactArticles.length > 0 && (
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          {compactArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              presentation="compact"
              onBookmark={onBookmark}
              onHide={onHide}
              isBookmarked={bookmarkedIds.has(article.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
