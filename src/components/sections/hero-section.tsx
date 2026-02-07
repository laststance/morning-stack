"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { Star, X, EyeOff, Ban, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Article, HideAction } from "@/types/article";
import { ArticleCard, SOURCE_COLORS, SOURCE_LABELS } from "@/components/cards/article-card";
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
  const capitalized = words.find((w) => /^[A-Z]/.test(w) && !/^(The|And|For|How|Why|What|New|Top)$/i.test(w));
  return capitalized ?? words[0] ?? title.slice(0, 20);
}

export interface HeroSectionProps {
  /** All articles from the current edition. Sorted by score internally to pick top 4. */
  articles: Article[];
  /** Called when the user clicks the bookmark button on any article. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
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
        isBookmarked={bookmarkedIds.has(mainArticle.externalId)}
      />

      {/* Sub-articles: 3-column grid below main card */}
      {subArticles.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subArticles.map((article) => (
            <ArticleCard
              key={article.externalId}
              article={article}
              onBookmark={onBookmark}
              onHide={onHide}
              isBookmarked={bookmarkedIds.has(article.externalId)}
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
  article: Article;
  onBookmark?: (article: Article) => void;
  onHide?: (action: HideAction) => void;
  isBookmarked?: boolean;
}

/**
 * Large featured card for the primary hero article.
 * Shows a large thumbnail, headline, 3-line excerpt, source badge, and time.
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

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-md glass-panel",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-ms-border",
        "focus-within:ring-2 focus-within:ring-ms-accent/50",
      )}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Thumbnail — large, 3/4 width on desktop */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-[16/9] w-full overflow-hidden bg-ms-bg-tertiary lg:aspect-auto lg:min-h-[320px] lg:w-3/4"
          aria-label={`Read: ${article.title}`}
        >
          {article.thumbnailUrl && !imgError ? (
            <Image
              src={article.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 75vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center text-ms-text-muted lg:min-h-[320px]">
              <span className="text-6xl" role="img" aria-hidden="true">
                {sourceLabel?.[0] ?? "?"}
              </span>
            </div>
          )}

          {/* Source brand color indicator bar */}
          <span
            className={cn(
              "absolute bottom-0 left-0 h-1 w-full",
              SOURCE_COLORS[article.source],
            )}
            aria-hidden="true"
          />
        </a>

        {/* Content — right side on desktop, below on mobile */}
        <div className="flex flex-1 flex-col justify-center gap-3 bg-ms-bg-secondary/40 p-5 backdrop-blur-sm lg:p-6">
          {/* Source badge + time */}
          <div className="flex items-center gap-2 text-xs text-ms-text-muted">
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
                <span className="font-mono tabular-nums" title={`${article.score} points`}>
                  {formatScore(article.score)}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold leading-tight text-ms-text-primary sm:text-2xl">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="outline-none focus-visible:underline"
            >
              {article.title}
            </a>
          </h2>

          {/* Excerpt — 3-line clamp */}
          {article.excerpt && (
            <p className="line-clamp-3 text-sm leading-relaxed text-ms-text-secondary">
              {article.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Hover action buttons */}
      <div
        className={cn(
          "absolute right-3 top-3 flex gap-1",
          "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBookmark?.(article);
          }}
          className={cn(
            "flex size-8 items-center justify-center rounded-md glass-subtle transition-colors",
            "hover:bg-ms-accent/90 hover:text-white",
            isBookmarked ? "text-ms-accent" : "text-ms-text-secondary",
          )}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
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
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex size-8 items-center justify-center rounded-md glass-subtle transition-colors",
                "text-ms-text-secondary hover:bg-ms-accent/90 hover:text-white",
              )}
              aria-label="Hide options"
            >
              <X className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-ms-bg-secondary border-ms-border"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={() =>
                onHide?.({ type: "article", targetId: article.externalId })
              }
              className="text-ms-text-primary focus:bg-ms-bg-tertiary focus:text-ms-text-primary"
            >
              <EyeOff className="size-4 text-ms-text-muted" />
              Hide this article
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onHide?.({ type: "source", targetId: article.source })
              }
              className="text-ms-text-primary focus:bg-ms-bg-tertiary focus:text-ms-text-primary"
            >
              <Ban className="size-4 text-ms-text-muted" />
              Hide from {sourceLabel}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onHide?.({ type: "topic", targetId: keyword })
              }
              className="text-ms-text-primary focus:bg-ms-bg-tertiary focus:text-ms-text-primary"
            >
              <Tag className="size-4 text-ms-text-muted" />
              Hide topic: {keyword}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
