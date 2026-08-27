"use client";

import { useCallback, useState } from "react";
import {
  Star,
  X,
  MessageSquare,
  ArrowBigUp,
  EyeOff,
  Ban,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/sections/section-header";
import { SOURCE_LABELS } from "@/components/cards/article-card";
import { ShareMenu } from "@/components/cards/share-menu";
import type { PersistedArticle, HideAction } from "@/types/article";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Format a score as a compact engagement label (e.g., 1.2k).
 * @param score - The numeric score to format.
 * @returns Compact string representation.
 * @example
 * formatScore(42)   // => "42"
 * formatScore(1500) // => "1.5k"
 */
function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return String(score);
}

/**
 * Extract the first meaningful keyword from an article title.
 * @param title - The article title to extract from.
 * @returns A keyword string for topic-based hiding.
 * @example
 * extractKeyword("Show HN: A new database engine") // => "Show"
 */
function extractKeyword(title: string): string {
  const words = title.split(/\s+/).filter((w) => w.length >= 3);
  const capitalized = words.find(
    (w) => /^[A-Z]/.test(w) && !/^(The|And|For|How|Why|What|New|Top)$/i.test(w),
  );
  return capitalized ?? words[0] ?? title.slice(0, 20);
}

/**
 * Extract the hostname from a URL for display (e.g., "github.com").
 * Returns undefined for HN discussion pages or invalid URLs.
 * @param url - The article URL.
 * @returns Hostname string or undefined.
 * @example
 * extractDomain("https://github.com/foo/bar") // => "github.com"
 * extractDomain("https://news.ycombinator.com/item?id=123") // => undefined
 */
function extractDomain(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname === "news.ycombinator.com") return undefined;
    return hostname;
  } catch {
    return undefined;
  }
}

// ─── HN List Item ────────────────────────────────────────────────────

interface HNListItemProps {
  /** The HN article data. */
  article: PersistedArticle;
  /** 1-based ranking position in the list. */
  rank: number;
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Whether this article is currently bookmarked. */
  isBookmarked?: boolean;
}

/**
 * Renders one ranked Hacker News story with touch-visible actions and desktop hover actions without covering its headline.
 * @param props - Persisted story, list rank, bookmark state, and optional personalization callbacks.
 * @returns A compact HN row with engagement metadata and article actions.
 * @example
 * <HNListItem article={article} rank={1} isBookmarked={false} />
 */
function HNListItem({
  article,
  rank,
  onBookmark,
  onHide,
  isBookmarked = false,
}: HNListItemProps) {
  const meta = article.metadata;
  const comments = (meta.comments as number) ?? 0;
  const author = (meta.author as string) ?? "";
  const sourceLabel = SOURCE_LABELS[article.source];
  const keyword = extractKeyword(article.title);
  const domain = extractDomain(article.url);

  const [shareExpanded, setShareExpanded] = useState(false);

  const handleShareToggle = useCallback(() => {
    setShareExpanded((prev) => !prev);
  }, []);

  const handleCopied = useCallback(() => {
    toast.success("Copied!", { duration: 2000 });
  }, []);

  return (
    <article
      className={cn(
        "group relative flex items-start gap-3 rounded-md px-3 pt-14 pb-2.5 lg:py-2.5",
        "border border-transparent bg-transparent",
        "transition-all duration-150",
        "hover:border-ms-border/50 hover:bg-ms-bg-secondary hover:shadow-sm",
        "focus-within:border-ms-border/50 focus-within:bg-ms-bg-secondary",
      )}
    >
      {/* Rank number */}
      <span
        className="text-ms-text-muted mt-0.5 flex size-6 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold"
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <h3 className="text-ms-text-primary text-sm leading-snug font-medium">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            data-article-headline
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {article.title}
          </a>
          {domain && (
            <span className="text-ms-text-muted ml-1.5 text-xs font-normal">
              ({domain})
            </span>
          )}
        </h3>

        {/* Meta row: points + comments + author */}
        <div className="text-ms-text-muted mt-1 flex items-center gap-3 text-xs">
          {/* Points */}
          <span
            className="inline-flex items-center gap-1 font-mono text-orange-500 tabular-nums"
            title={`${article.score} points`}
          >
            <ArrowBigUp className="size-3.5" aria-hidden="true" />
            {formatScore(article.score)}
          </span>

          {/* Comments */}
          <a
            href={`https://news.ycombinator.com/item?id=${article.externalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ms-text-secondary relative z-10 inline-flex items-center gap-1 transition-colors"
            title={`${comments} comments`}
          >
            <MessageSquare className="size-3" aria-hidden="true" />
            <span className="font-mono tabular-nums">{comments}</span>
          </a>

          {/* Author */}
          {author && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{author}</span>
            </>
          )}
        </div>
      </div>

      {/* Mobile reserves a top row for touch; desktop overlays compact actions on hover or focus. */}
      <div
        className={cn(
          "absolute top-2 right-2 z-10 flex gap-0.5 opacity-100 transition-opacity",
          "lg:gap-1 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
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
            "glass-subtle flex size-11 items-center justify-center rounded-md transition-colors lg:size-7",
            "hover:bg-ms-accent/90 hover:text-white",
            isBookmarked ? "text-ms-accent" : "text-ms-text-secondary",
          )}
          aria-label={
            !onBookmark
              ? "Bookmark status unavailable"
              : isBookmarked
                ? "Remove bookmark"
                : "Bookmark"
          }
        >
          <Star
            className="size-3.5"
            fill={isBookmarked ? "currentColor" : "none"}
          />
        </button>

        <ShareMenu
          article={article}
          isExpanded={shareExpanded}
          onToggle={handleShareToggle}
          onCopied={handleCopied}
          size="sm"
        />

        {/* Hide dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!onHide}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "glass-subtle flex size-11 items-center justify-center rounded-md transition-colors lg:size-7",
                "text-ms-text-secondary hover:bg-ms-accent/90 hover:text-white",
              )}
              aria-label={
                onHide ? "Hide options" : "Hidden preferences unavailable"
              }
            >
              <X className="size-3.5" />
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

// ─── Props ───────────────────────────────────────────────────────────

export interface HackerNewsSectionProps {
  /** Hacker News articles to display. */
  articles: PersistedArticle[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
}

// ─── Main section ────────────────────────────────────────────────────

/**
 * Renders Hacker News as a lead story plus a ranked two-column desktop list whenever the source band appears.
 * @param props - Persisted HN stories and optional personalization callbacks.
 * @returns A compact ranked band that stays one column on touch layouts.
 * @example
 * <HackerNewsSection articles={articles} />
 */
export function HackerNewsSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
}: HackerNewsSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section
      aria-label="Hacker News"
      className="flex min-w-0 flex-col gap-3"
      data-layout="editorial-band"
    >
      <SectionHeader icon="🔶" title="Hacker News" />

      {/* The lead story owns the first row; the remaining text-first stories use both desktop columns. */}
      <div className="grid grid-cols-1 gap-0.5 lg:grid-cols-2 lg:gap-x-6">
        {articles.slice(0, 5).map((article, index) => (
          <div key={article.id} className={cn(index === 0 && "lg:col-span-2")}>
            <HNListItem
              article={article}
              rank={index + 1}
              onBookmark={onBookmark}
              onHide={onHide}
              isBookmarked={bookmarkedIds.has(article.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
