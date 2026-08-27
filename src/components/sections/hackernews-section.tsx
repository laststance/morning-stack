"use client";

import { ArrowBigUp, MessageSquare } from "lucide-react";

import { ArticleActions } from "@/components/cards/article-actions";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/sections/section-header";
import type { PersistedArticle, HideAction } from "@/types/article";

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
  const domain = extractDomain(article.url);

  return (
    <article
      className={cn(
        "group relative flex items-start gap-3 rounded-md px-3 pt-14 pb-2.5 lg:py-2.5",
        "border border-transparent bg-transparent",
        "transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none",
        "hover:border-ms-border/50 hover:bg-ms-bg-secondary hover:shadow-sm",
        "focus-within:border-ms-border/50 focus-within:bg-ms-bg-secondary",
      )}
      data-article-variant="ranked"
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

      <ArticleActions
        article={article}
        onBookmark={onBookmark}
        onHide={onHide}
        isBookmarked={isBookmarked}
        size="compact"
        className="absolute top-2 right-2 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
      />
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
      <SectionHeader title="Hacker News" />

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
