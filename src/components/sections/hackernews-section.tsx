"use client";

import { useCallback, useState } from "react";
import { Star, X, MessageSquare, ArrowBigUp, EyeOff, Ban, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/sections/section-header";
import { SOURCE_LABELS } from "@/components/cards/article-card";
import { ShareMenu } from "@/components/cards/share-menu";
import type { Article, HideAction } from "@/types/article";
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
    (w) =>
      /^[A-Z]/.test(w) &&
      !/^(The|And|For|How|Why|What|New|Top)$/i.test(w),
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
  article: Article;
  /** 1-based ranking position in the list. */
  rank: number;
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Whether this article is currently bookmarked. */
  isBookmarked?: boolean;
}

/**
 * A single Hacker News list item in Bloomberg data-dense style.
 *
 * Renders a compact row with rank number, title, domain hint, points,
 * comment count, and author. Hover reveals action buttons (bookmark,
 * share, hide). Uses glass-panel styling consistent with the design system.
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
        "group relative flex items-start gap-3 rounded-md px-3 py-2.5",
        "border border-transparent bg-transparent",
        "transition-all duration-150",
        "hover:border-ms-border/50 hover:bg-ms-bg-secondary hover:shadow-sm",
        "focus-within:border-ms-border/50 focus-within:bg-ms-bg-secondary",
      )}
    >
      {/* Rank number */}
      <span
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold text-ms-text-muted"
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <h3 className="text-sm font-medium leading-snug text-ms-text-primary">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {article.title}
          </a>
          {domain && (
            <span className="ml-1.5 text-xs font-normal text-ms-text-muted">
              ({domain})
            </span>
          )}
        </h3>

        {/* Meta row: points + comments + author */}
        <div className="mt-1 flex items-center gap-3 text-xs text-ms-text-muted">
          {/* Points */}
          <span
            className="inline-flex items-center gap-1 font-mono tabular-nums text-orange-500"
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
            className="relative z-10 inline-flex items-center gap-1 transition-colors hover:text-ms-text-secondary"
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

      {/* Hover action buttons */}
      <div
        className={cn(
          "absolute right-2 top-2 flex gap-1",
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
            "flex size-7 items-center justify-center rounded-md glass-subtle transition-colors",
            "hover:bg-ms-accent/90 hover:text-white",
            isBookmarked ? "text-ms-accent" : "text-ms-text-secondary",
          )}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
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
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex size-7 items-center justify-center rounded-md glass-subtle transition-colors",
                "text-ms-text-secondary hover:bg-ms-accent/90 hover:text-white",
              )}
              aria-label="Hide options"
            >
              <X className="size-3.5" />
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

// ─── Props ───────────────────────────────────────────────────────────

export interface HackerNewsSectionProps {
  /** Hacker News articles to display. */
  articles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
  bookmarkedIds?: Set<string>;
}

// ─── Main section ────────────────────────────────────────────────────

/**
 * Hacker News section displaying top front-page stories as a ranked list.
 *
 * Uses a compact list view instead of image cards since HN content is
 * text-only. Each item shows rank number, title, domain hint, points,
 * comment count, and author — matching the Bloomberg data-dense aesthetic.
 */
export function HackerNewsSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
}: HackerNewsSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section aria-label="Hacker News" className="flex flex-col gap-3">
      <SectionHeader icon="🔶" title="Hacker News" />

      {/* Ranked list — no horizontal scroll needed for compact items */}
      <div className="flex flex-col gap-0.5">
        {articles.slice(0, 5).map((article, index) => (
          <HNListItem
            key={article.externalId}
            article={article}
            rank={index + 1}
            onBookmark={onBookmark}
            onHide={onHide}
            isBookmarked={bookmarkedIds.has(article.externalId)}
          />
        ))}
      </div>
    </section>
  );
}
