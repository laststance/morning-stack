"use client";

import Image from "next/image";
import { useState } from "react";

import { ArticleActions } from "@/components/cards/article-actions";
import { ArticleCard } from "@/components/cards/article-card";
import {
  ARTICLE_IMAGE_SIZES,
  SOURCE_BADGE_TEXT_COLORS,
  SOURCE_COLORS,
  SOURCE_LABELS,
} from "@/components/cards/constants";
import { SectionHeader } from "@/components/sections/section-header";
import { cn } from "@/lib/utils";
import type { PersistedArticle, HideAction } from "@/types/article";

/** Format a timestamp into a relative time label. */
function formatRelativeTime(dateInput: string | number | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Format a score as a compact engagement label (e.g., 1.2k). */
function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return String(score);
}

export interface FeaturedStoryProps {
  /** Featured article or supporting articles selected once by HomeContent. */
  articles: PersistedArticle[];
  /** Called when the user clicks the bookmark button on any article. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
}

/**
 * Selects the lead and three supporting stories whenever HomeContent recalculates its personalized article set.
 * @returns The highest-scoring article and up to three supporting stories.
 * @example
 * selectFeaturedStories(articles) // => { leadArticle, supportingArticles }
 */
export function selectFeaturedStories(articles: PersistedArticle[]): {
  leadArticle: PersistedArticle | undefined;
  supportingArticles: PersistedArticle[];
} {
  const sortedArticles = [...articles].sort(
    (firstArticle, secondArticle) => secondArticle.score - firstArticle.score,
  );
  const leadArticle = sortedArticles[0];
  // GitHub repositories and pull requests already own dedicated bands, so they must not be promoted out of them.
  const supportingArticles = sortedArticles
    .filter(
      (article) =>
        article.id !== leadArticle?.id &&
        article.source !== "github" &&
        article.source !== "github_prs",
    )
    .slice(0, 3);

  return {
    leadArticle,
    supportingArticles,
  };
}

/**
 * Renders the single lead story whenever HomeContent has at least one visible article.
 * @returns The page-defining lead article, or nothing when the edition has no visible articles.
 * @example
 * <LeadStory articles={[article]} />
 */
export function LeadStory({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
}: FeaturedStoryProps) {
  const leadArticle = articles[0];

  if (!leadArticle) return null;

  return (
    <section aria-label="Featured story" data-layout="lead-story">
      <HeroMainCard
        article={leadArticle}
        onBookmark={onBookmark}
        onHide={onHide}
        isBookmarked={bookmarkedIds.has(leadArticle.id)}
      />
    </section>
  );
}

/**
 * Renders secondary top stories after GitHub and widgets so every viewport keeps the same reading order.
 * @returns A three-story supporting band, or nothing when no supporting stories remain.
 * @example
 * <SupportingHeadlines articles={articles.slice(1, 4)} />
 */
export function SupportingHeadlines({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
}: FeaturedStoryProps) {
  if (articles.length === 0) return null;

  return (
    <section
      aria-label="Supporting headlines"
      className="flex min-w-0 flex-col gap-3"
      data-layout="supporting-headlines"
    >
      <SectionHeader title="More top stories" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {articles.map((article) => (
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
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hero Main Card — large featured article                            */
/* ------------------------------------------------------------------ */

interface HeroMainCardProps {
  article: PersistedArticle;
  onBookmark?: (article: PersistedArticle) => void;
  onHide?: (action: HideAction) => void;
  isBookmarked?: boolean;
}

/**
 * Renders the primary featured article with touch-visible actions and a compact desktop hover treatment.
 * @param props - Featured article, bookmark state, and optional personalization callbacks.
 * @returns The large hero card for the highest-scoring article.
 * @example
 * <HeroMainCard article={article} onBookmark={handleBookmark} />
 */
function HeroMainCard({
  article,
  onBookmark,
  onHide,
  isBookmarked = false,
}: HeroMainCardProps) {
  const [imgError, setImgError] = useState(false);

  const createdAt =
    (article.metadata.createdAt as string | undefined) ??
    (article.metadata.publishDate as string | undefined);

  const sourceLabel = SOURCE_LABELS[article.source];
  const thumbnailUrl =
    article.thumbnailUrl && !imgError ? article.thumbnailUrl : null;
  const supportingText = getHeroSupportingText(article);

  return (
    <article
      className={cn(
        "group border-ms-border/70 bg-ms-bg-secondary relative overflow-hidden rounded-md border",
        "transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
        "hover:border-ms-border hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        "focus-within:ring-ms-accent/50 focus-within:ring-2",
      )}
      data-article-variant="lead"
    >
      {!thumbnailUrl && (
        <span
          className={cn(
            "absolute top-0 left-0 h-1 w-full",
            SOURCE_COLORS[article.source],
          )}
          aria-hidden="true"
        />
      )}

      <div className={cn("flex flex-col", thumbnailUrl && "lg:flex-row")}>
        {thumbnailUrl && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ms-bg-tertiary relative block aspect-[16/9] w-full overflow-hidden lg:aspect-auto lg:min-h-[320px] lg:w-3/4"
            aria-label={`Read: ${article.title}`}
          >
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              sizes={ARTICLE_IMAGE_SIZES.lead}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              priority
              onError={() => setImgError(true)}
            />

            {/* Source brand color indicator bar */}
            <span
              className={cn(
                "absolute bottom-0 left-0 h-1 w-full",
                SOURCE_COLORS[article.source],
              )}
              aria-hidden="true"
            />
          </a>
        )}

        {/* Content — right side on desktop, below on mobile */}
        <div
          className={cn(
            "bg-ms-bg-secondary/40 flex flex-1 flex-col justify-center gap-3 p-5 backdrop-blur-sm lg:p-6",
            !thumbnailUrl && "min-h-[260px] sm:min-h-[300px] lg:min-h-[320px]",
          )}
        >
          {/* Source badge + time */}
          <div className="text-ms-text-muted flex items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium",
                SOURCE_COLORS[article.source],
                SOURCE_BADGE_TEXT_COLORS[article.source],
              )}
            >
              {sourceLabel}
            </span>

            {createdAt && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={new Date(createdAt).toISOString()}>
                  {formatRelativeTime(createdAt)}
                </time>
              </>
            )}

            {article.score > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className="font-mono tabular-nums"
                  title={`${article.score} points`}
                >
                  {formatScore(article.score)}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-ms-text-primary text-2xl leading-[1.1] font-semibold tracking-[-0.025em] text-balance sm:text-3xl lg:text-4xl">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              data-article-headline
              className="outline-none after:absolute after:inset-0 focus-visible:underline"
            >
              {article.title}
            </a>
          </h1>

          {/* Supporting context fills the lead card without competing with its headline. */}
          {supportingText && (
            <p
              className="text-ms-text-secondary line-clamp-3 max-w-[65ch] text-base leading-relaxed"
              data-article-summary
            >
              {supportingText}
            </p>
          )}
        </div>
      </div>

      <ArticleActions
        article={article}
        onBookmark={onBookmark}
        onHide={onHide}
        isBookmarked={isBookmarked}
        className={cn(
          "ml-auto px-5 pb-5",
          "lg:absolute lg:top-3 lg:right-3 lg:p-0 lg:opacity-0",
          "lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
        )}
      />
    </article>
  );
}

/**
 * Builds factual lead-card context when HeroMainCard receives a story, avoiding fabricated summaries for HN links without excerpts.
 * @param article - Persisted featured article with optional excerpt and source metadata.
 * @returns
 * - Non-HN article: its trimmed stored excerpt when available.
 * - HN article: a source-backed sentence using its submitter and comment count.
 * @example
 * getHeroSupportingText(hackerNewsArticle) // => "Featured Hacker News discussion submitted by alice. The community has added 42 comments so far."
 */
function getHeroSupportingText(article: PersistedArticle): string | undefined {
  const storedExcerpt = article.excerpt?.trim();
  if (article.source !== "hackernews") return storedExcerpt || undefined;

  const metadataAuthor = article.metadata.author;
  const metadataComments = article.metadata.comments;
  const author =
    typeof metadataAuthor === "string" && metadataAuthor.trim().length > 0
      ? metadataAuthor.trim()
      : undefined;
  const commentCount =
    typeof metadataComments === "number" && metadataComments >= 0
      ? metadataComments
      : undefined;

  if (author && commentCount !== undefined) {
    const commentLabel = commentCount === 1 ? "comment" : "comments";
    return `Featured Hacker News discussion submitted by ${author}. The community has added ${commentCount} ${commentLabel} so far.`;
  }

  if (commentCount !== undefined) {
    const commentLabel = commentCount === 1 ? "comment" : "comments";
    return `Featured Hacker News discussion with ${commentCount} community ${commentLabel}.`;
  }

  if (author) return `Featured Hacker News discussion submitted by ${author}.`;

  return "Featured discussion from the Hacker News community.";
}
