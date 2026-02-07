"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { Star, X, EyeOff, Ban, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Article, ArticleSource, HideAction } from "@/types/article";
import { ShareMenu } from "@/components/cards/share-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Source-specific brand colors for the indicator badge. */
export const SOURCE_COLORS: Record<ArticleSource, string> = {
  hackernews: "bg-orange-500",
  github: "bg-gray-400",
  github_prs: "bg-purple-500",
  reddit: "bg-red-500",
  producthunt: "bg-amber-500",
  tech_rss: "bg-blue-500",
  hatena: "bg-sky-400",
  bluesky: "bg-blue-400",
  youtube: "bg-red-600",
  world_news: "bg-emerald-500",
};

/** Human-readable source labels. */
export const SOURCE_LABELS: Record<ArticleSource, string> = {
  hackernews: "Hacker News",
  github: "GitHub",
  github_prs: "GitHub PR",
  reddit: "Reddit",
  producthunt: "Product Hunt",
  tech_rss: "Tech News",
  hatena: "Hatena",
  bluesky: "Bluesky",
  youtube: "YouTube",
  world_news: "World News",
};

/**
 * Format a timestamp or ISO string into a relative time label.
 * Returns coarse-grained labels: "1m ago", "2h ago", "3d ago".
 */
function formatRelativeTime(dateInput: string | number | Date): string {
  const date =
    dateInput instanceof Date ? dateInput : new Date(dateInput);
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
 * Returns the longest capitalized word (>= 3 chars), or the first word.
 */
function extractKeyword(title: string): string {
  const words = title.split(/\s+/).filter((w) => w.length >= 3);
  const capitalized = words.find((w) => /^[A-Z]/.test(w) && !/^(The|And|For|How|Why|What|New|Top)$/i.test(w));
  return capitalized ?? words[0] ?? title.slice(0, 20);
}

export interface ArticleCardProps {
  /** The article data to display. */
  article: Article;
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Whether this article is currently bookmarked. */
  isBookmarked?: boolean;
}

/**
 * A reusable card component for displaying an article from any source.
 *
 * Renders a thumbnail (with fallback), title, source badge, relative time,
 * engagement score, and hover-visible action buttons (bookmark, share, hide).
 * The hide button opens a dropdown with options to hide the article, source,
 * or topic.
 */
export function ArticleCard({
  article,
  onBookmark,
  onHide,
  isBookmarked = false,
}: ArticleCardProps) {
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
        "group relative flex flex-col overflow-hidden rounded-md",
        "border border-ms-border/50 bg-ms-bg-secondary",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-ms-border",
        "focus-within:ring-2 focus-within:ring-ms-accent/50",
      )}
    >
      {/* Thumbnail */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[16/9] w-full overflow-hidden bg-ms-bg-tertiary"
        aria-label={`Read: ${article.title}`}
      >
        {article.thumbnailUrl && !imgError ? (
          <Image
            src={article.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ms-text-muted">
            <span className="text-3xl" role="img" aria-hidden="true">
              {sourceLabel?.[0] ?? "?"}
            </span>
          </div>
        )}

        {/* Source brand color indicator bar */}
        <span
          className={cn(
            "absolute bottom-0 left-0 h-0.5 w-full",
            SOURCE_COLORS[article.source],
          )}
          aria-hidden="true"
        />
      </a>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ms-text-primary">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {article.title}
          </a>
        </h3>

        {/* Meta row: source badge + time + score */}
        <div className="mt-auto flex items-center gap-2 text-xs text-ms-text-muted">
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
            "flex size-8 items-center justify-center rounded-md glass-subtle transition-colors",
            "hover:bg-ms-accent/90 hover:text-white",
            isBookmarked
              ? "text-ms-accent"
              : "text-ms-text-secondary",
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
