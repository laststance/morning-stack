"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { Star, X, EyeOff, Ban, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PersistedArticle, HideAction } from "@/types/article";
import {
  ArticleCard,
  SOURCE_COLORS,
  SOURCE_LABELS,
} from "@/components/cards/article-card";
import { ShareMenu } from "@/components/cards/share-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

/**
 * Extract the first meaningful keyword from an article title.
 */
function extractKeyword(title: string): string {
  const words = title.split(/\s+/).filter((w) => w.length >= 3);
  const capitalized = words.find(
    (w) => /^[A-Z]/.test(w) && !/^(The|And|For|How|Why|What|New|Top)$/i.test(w),
  );
  return capitalized ?? words[0] ?? title.slice(0, 20);
}

export interface HeroSectionProps {
  /** All articles from the current edition. Sorted by score internally to pick top 4. */
  articles: PersistedArticle[];
  /** Called when the user clicks the bookmark button on any article. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
}

/**
 * Hero section displaying the top featured stories prominently.
 *
 * Shows 1 main featured article (large card) with 3 sub-articles
 * in a 3-column grid below. Articles are selected by highest score
 * across all sources.
 */
export function HeroSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
}: HeroSectionProps) {
  const sorted = [...articles].sort((a, b) => b.score - a.score);
  const mainArticle = sorted[0];
  const subArticles = sorted.slice(1, 4);

  if (!mainArticle) {
    return null;
  }

  return (
    <section aria-label="Featured stories">
      {/* Main featured article */}
      <HeroMainCard
        article={mainArticle}
        onBookmark={onBookmark}
        onHide={onHide}
        isBookmarked={bookmarkedIds.has(mainArticle.id)}
      />

      {/* Sub-articles: 3-column grid below main card */}
      {subArticles.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
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
  const [shareExpanded, setShareExpanded] = useState(false);

  const handleShareToggle = useCallback(() => {
    setShareExpanded((prev) => !prev);
  }, []);

  const handleCopied = useCallback(() => {
    toast.success("Copied!", { duration: 2000 });
  }, []);

  const createdAt =
    (article.metadata.createdAt as string | undefined) ??
    (article.metadata.publishDate as string | undefined);

  const sourceLabel = SOURCE_LABELS[article.source];
  const keyword = extractKeyword(article.title);
  const thumbnailUrl =
    article.thumbnailUrl && !imgError ? article.thumbnailUrl : null;

  return (
    <article
      className={cn(
        "group glass-panel relative overflow-hidden rounded-md",
        "transition-all duration-200",
        "hover:border-ms-border hover:-translate-y-0.5 hover:shadow-lg",
        "focus-within:ring-ms-accent/50 focus-within:ring-2",
      )}
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
              sizes="(max-width: 1024px) 100vw, 75vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
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
                "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-white",
                SOURCE_COLORS[article.source],
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
          <h2 className="text-ms-text-primary text-xl leading-tight font-bold sm:text-2xl">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              data-article-headline
              className="outline-none focus-visible:underline"
            >
              {article.title}
            </a>
          </h2>

          {/* Excerpt — 3-line clamp */}
          {article.excerpt && (
            <p className="text-ms-text-secondary line-clamp-3 text-sm leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Touch layouts keep actions visible; desktop reveals the compact row on hover or focus. */}
      <div
        className={cn(
          "relative z-10 ml-auto flex w-fit gap-1 px-5 pb-5",
          "opacity-100 transition-opacity lg:absolute lg:top-3 lg:right-3 lg:p-0 lg:opacity-0",
          "lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          disabled={!onBookmark}
          onClick={(e) => {
            e.stopPropagation();
            onBookmark?.(article);
          }}
          className={cn(
            "glass-subtle flex size-11 items-center justify-center rounded-md transition-colors lg:size-8",
            "hover:bg-ms-accent/90 hover:text-white",
            isBookmarked ? "text-ms-accent" : "text-ms-text-secondary",
          )}
          aria-label={
            !onBookmark
              ? "Bookmark status unavailable"
              : isBookmarked
                ? "Remove bookmark"
                : "Bookmark article"
          }
        >
          <Star
            className="size-4"
            fill={isBookmarked ? "currentColor" : "none"}
          />
        </button>

        <ShareMenu
          article={article}
          isExpanded={shareExpanded}
          onToggle={handleShareToggle}
          onCopied={handleCopied}
        />

        {/* Hide dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!onHide}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "glass-subtle flex size-11 items-center justify-center rounded-md transition-colors lg:size-8",
                "text-ms-text-secondary hover:bg-ms-accent/90 hover:text-white",
              )}
              aria-label={
                onHide ? "Hide options" : "Hidden preferences unavailable"
              }
            >
              <X className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-ms-bg-secondary border-ms-border w-56"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={() =>
                onHide?.({ type: "article", targetId: article.id })
              }
              className="text-ms-text-primary focus:bg-ms-bg-tertiary focus:text-ms-text-primary"
            >
              <EyeOff className="text-ms-text-muted size-4" />
              Hide this article
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onHide?.({ type: "source", targetId: article.source })
              }
              className="text-ms-text-primary focus:bg-ms-bg-tertiary focus:text-ms-text-primary"
            >
              <Ban className="text-ms-text-muted size-4" />
              Hide from {sourceLabel}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onHide?.({ type: "topic", targetId: keyword })}
              className="text-ms-text-primary focus:bg-ms-bg-tertiary focus:text-ms-text-primary"
            >
              <Tag className="text-ms-text-muted size-4" />
              Hide topic: {keyword}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
