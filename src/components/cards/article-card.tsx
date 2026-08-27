"use client";

import Image from "next/image";
import { useState } from "react";

import { ArticleActions } from "@/components/cards/article-actions";
import {
  ARTICLE_IMAGE_SIZES,
  SOURCE_BADGE_TEXT_COLORS,
  SOURCE_COLORS,
  SOURCE_LABELS,
  type ArticleCardPresentation,
} from "@/components/cards/constants";
import { cn } from "@/lib/utils";
import type { HideAction, PersistedArticle } from "@/types/article";

/**
 * Formats persisted source timestamps whenever ArticleCard renders compact recency metadata.
 * @returns A coarse relative label such as `1m ago`, `2h ago`, or `3d ago`.
 * @example
 * formatRelativeTime(new Date(Date.now() - 60_000)) // => "1m ago"
 */
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

/**
 * Formats source scores whenever ArticleCard renders compact engagement metadata.
 * @returns The integer score or a one-decimal thousands label.
 * @example
 * formatScore(1200) // => "1.2k"
 */
function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return String(score);
}

export interface ArticleCardProps {
  /** The article data to display. */
  article: PersistedArticle;
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Whether this article is currently bookmarked. */
  isBookmarked?: boolean;
  /** Explicit presentation controls media width, compact-row treatment, and image hints. */
  presentation?: ArticleCardPresentation;
  /** Shows the stored article description when the parent promotes this card. */
  showExcerpt?: boolean;
}

/**
 * Renders a source-agnostic article card whose actions stay visible on touch layouts and compact on desktop hover.
 * @param props - Article content, personalization actions, bookmark state, and optional wide or excerpt presentation.
 * @returns An article card with bookmark, share, and hide controls.
 * @example
 * <ArticleCard article={article} onBookmark={handleBookmark} />
 */
export function ArticleCard({
  article,
  onBookmark,
  onHide,
  isBookmarked = false,
  presentation = "standard",
  showExcerpt = false,
}: ArticleCardProps) {
  const [imgError, setImgError] = useState(false);

  const createdAt =
    (article.metadata.createdAt as string | undefined) ??
    (article.metadata.publishDate as string | undefined);

  const sourceLabel = SOURCE_LABELS[article.source];
  const thumbnailUrl =
    presentation !== "compact" && article.thumbnailUrl && !imgError
      ? article.thumbnailUrl
      : null;
  const usesWideLayout = presentation === "wide" && Boolean(thumbnailUrl);
  const excerpt = showExcerpt ? article.excerpt?.trim() : undefined;
  const isCompact = presentation === "compact";

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden",
        "transition-[border-color,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
        !isCompact &&
          "border-ms-border/60 bg-ms-bg-secondary rounded-md border",
        isCompact &&
          "border-ms-border/60 border-b bg-transparent py-3 last:border-b-0",
        !isCompact &&
          "hover:border-ms-border hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        isCompact && "hover:bg-ms-bg-secondary/55",
        "focus-within:ring-ms-accent/50 focus-within:ring-2",
        usesWideLayout && "lg:grid lg:grid-cols-2",
      )}
      data-article-variant={presentation}
    >
      {thumbnailUrl ? (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "bg-ms-bg-tertiary relative block aspect-[16/9] w-full overflow-hidden",
            usesWideLayout && "lg:aspect-auto lg:min-h-64",
          )}
          aria-label={`Read: ${article.title}`}
        >
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes={ARTICLE_IMAGE_SIZES[presentation]}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            onError={() => setImgError(true)}
          />

          {/* Source brand color indicator bar */}
          <span
            className={cn(
              "absolute bottom-0 left-0 h-0.5 w-full",
              SOURCE_COLORS[article.source],
            )}
            aria-hidden="true"
          />
        </a>
      ) : !isCompact ? (
        <span
          className={cn("h-0.5 w-full shrink-0", SOURCE_COLORS[article.source])}
          aria-hidden="true"
        />
      ) : null}

      {/* Content */}
      <div
        className={cn(
          "flex flex-1 flex-col gap-2 p-3",
          !thumbnailUrl && !isCompact && "min-h-28",
          isCompact && "px-1 py-0 pr-32 sm:px-2 lg:pr-36",
          usesWideLayout && "lg:p-6",
        )}
      >
        {/* Title */}
        <h3
          className={cn(
            "text-ms-text-primary line-clamp-2 text-sm leading-snug font-medium",
            excerpt && "text-base font-semibold",
          )}
        >
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            data-article-headline
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {article.title}
          </a>
        </h3>

        {/* Promoted repository cards use their stored description to make the larger footprint informative. */}
        {excerpt && (
          <p
            className="text-ms-text-secondary line-clamp-3 max-w-[65ch] text-sm leading-relaxed"
            data-article-summary
          >
            {excerpt}
          </p>
        )}

        {/* Meta row: source badge + time + score */}
        <div className="text-ms-text-muted mt-auto flex items-center gap-2 text-xs">
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
      </div>

      <ArticleActions
        article={article}
        onBookmark={onBookmark}
        onHide={onHide}
        isBookmarked={isBookmarked}
        size={isCompact ? "compact" : "standard"}
        className={cn(
          "ml-auto px-3 pb-3",
          "lg:absolute lg:top-2 lg:right-2 lg:p-0 lg:opacity-0",
          "lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
          isCompact && "absolute top-1/2 right-1 -translate-y-1/2 p-0",
        )}
      />
    </article>
  );
}
