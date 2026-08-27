"use client";

import { ArticleCard } from "@/components/cards/article-card";
import { SectionHeader } from "@/components/sections/section-header";
import type { PersistedArticle, HideAction } from "@/types/article";

export interface HatenaSectionProps {
  /** Hatena Bookmark entries to display (up to 5). */
  articles: PersistedArticle[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
  /** Original visible source positions retained when higher stories are promoted above this band. */
  articleRanks?: ReadonlyMap<string, number>;
}

/**
 * Renders Hatena as two visual leads followed by a ranked compact list whenever Japanese community stories exist.
 * @returns Nothing for an empty source, otherwise a five-story Hatena-specific composition.
 * @example
 * <HatenaSection articles={articles} />
 */
export function HatenaSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
  articleRanks,
}: HatenaSectionProps) {
  if (articles.length === 0) return null;

  const visibleArticles = articles.slice(0, 5);
  const featuredArticles = visibleArticles.slice(0, 2);
  const rankedArticles = visibleArticles.slice(2);

  return (
    <section
      aria-label="Hatena Bookmark"
      className="flex min-w-0 flex-col gap-3"
      data-layout="editorial-band"
    >
      <SectionHeader title="Hatena Bookmark" />

      {/* Two visual leads preserve source imagery without turning every entry into a poster. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {featuredArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            presentation="media-two-column"
            onBookmark={onBookmark}
            onHide={onHide}
            isBookmarked={bookmarkedIds.has(article.id)}
          />
        ))}
      </div>

      {rankedArticles.length > 0 && (
        <ol className="divide-ms-border/60 divide-y">
          {rankedArticles.map((article, index) => (
            <li
              key={article.id}
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2"
            >
              <span
                className="text-ms-text-muted pt-4 text-right font-mono text-xs tabular-nums"
                aria-label={`Rank ${articleRanks?.get(article.id) ?? index + 3}`}
              >
                {articleRanks?.get(article.id) ?? index + 3}
              </span>
              <ArticleCard
                article={article}
                presentation="compact"
                onBookmark={onBookmark}
                onHide={onHide}
                isBookmarked={bookmarkedIds.has(article.id)}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
