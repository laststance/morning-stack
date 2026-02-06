"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { Star, X, Play, Heart, Repeat2, Eye, EyeOff, Ban, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/sections/section-header";
import type { Article, HideAction } from "@/types/article";
import { SOURCE_LABELS } from "@/components/cards/article-card";
import { ShareMenu } from "@/components/cards/share-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Props ──────────────────────────────────────────────────────────

export interface SnsSectionProps {
  /** Bluesky posts to display (up to 3). */
  blueskyArticles: Article[];
  /** YouTube videos to display (up to 3). */
  youtubeArticles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
  bookmarkedIds?: Set<string>;
}

// ─── Brand colors ───────────────────────────────────────────────────

const BLUESKY_COLOR = "bg-blue-400";
const YOUTUBE_COLOR = "bg-red-600";

// ─── Helpers ────────────────────────────────────────────────────────

/** Format a view/like count into a compact label (e.g., 1.2M, 34K). */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Extract the first meaningful keyword from an article title.
 */
function extractKeyword(title: string): string {
  const words = title.split(/\s+/).filter((w) => w.length >= 3);
  const capitalized = words.find((w) => /^[A-Z]/.test(w) && !/^(The|And|For|How|Why|What|New|Top)$/i.test(w));
  return capitalized ?? words[0] ?? title.slice(0, 20);
}

// ─── YouTube Card ───────────────────────────────────────────────────

interface YouTubeCardProps {
  article: Article;
  onBookmark?: (article: Article) => void;
  onHide?: (action: HideAction) => void;
  isBookmarked?: boolean;
}

/**
 * YouTube-specific card with video thumbnail, play button overlay,
 * channel name, view count, and duration badge.
 */
function YouTubeCard({
  article,
  onBookmark,
  onHide,
  isBookmarked = false,
}: YouTubeCardProps) {
  const [imgError, setImgError] = useState(false);
  const views = (article.metadata.views as number) ?? 0;
  const channel = (article.metadata.channel as string) ?? "";
  const duration = (article.metadata.duration as string) ?? "";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-ms-border",
        "bg-ms-bg-secondary transition-colors hover:bg-ms-bg-tertiary",
        "focus-within:ring-2 focus-within:ring-ms-accent/50",
      )}
    >
      {/* Thumbnail with play overlay */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video w-full overflow-hidden bg-ms-bg-tertiary"
        aria-label={`Watch: ${article.title}`}
      >
        {article.thumbnailUrl && !imgError ? (
          <Image
            src={article.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ms-text-muted">
            <Play className="size-10" />
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full",
              "bg-red-600/90 text-white shadow-lg",
              "transition-transform group-hover:scale-110",
            )}
          >
            <Play className="size-5 fill-current" />
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {duration}
          </span>
        )}

        {/* Source brand bar */}
        <span
          className={cn("absolute bottom-0 left-0 h-0.5 w-full", YOUTUBE_COLOR)}
          aria-hidden="true"
        />
      </a>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
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

        <div className="mt-auto flex items-center gap-2 text-xs text-ms-text-muted">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-white",
              YOUTUBE_COLOR,
            )}
          >
            YouTube
          </span>

          {channel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{channel}</span>
            </>
          )}

          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-0.5">
            <Eye className="size-3" aria-hidden="true" />
            {formatCount(views)}
          </span>
        </div>
      </div>

      {/* Hover action buttons */}
      <ActionButtons
        article={article}
        isBookmarked={isBookmarked}
        onBookmark={onBookmark}
        onHide={onHide}
      />
    </article>
  );
}

// ─── Bluesky Card ───────────────────────────────────────────────────

interface BlueskyCardProps {
  article: Article;
  onBookmark?: (article: Article) => void;
  onHide?: (action: HideAction) => void;
  isBookmarked?: boolean;
}

/**
 * Bluesky-specific card with post text snippet, author handle,
 * like count, and repost count.
 */
function BlueskyCard({
  article,
  onBookmark,
  onHide,
  isBookmarked = false,
}: BlueskyCardProps) {
  const author = (article.metadata.author as string) ?? "";
  const displayName = (article.metadata.displayName as string) ?? author;
  const likes = (article.metadata.likes as number) ?? 0;
  const reposts = (article.metadata.reposts as number) ?? 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-ms-border",
        "bg-ms-bg-secondary transition-colors hover:bg-ms-bg-tertiary",
        "focus-within:ring-2 focus-within:ring-ms-accent/50",
      )}
    >
      {/* Source brand bar (top) */}
      <span
        className={cn("h-0.5 w-full shrink-0", BLUESKY_COLOR)}
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Author row */}
        <div className="flex items-center gap-2">
          {article.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- 32px avatar; Image optimization adds no value */
            <img
              src={article.thumbnailUrl}
              alt=""
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-blue-400/20 text-xs font-bold text-blue-400">
              {displayName[0]?.toUpperCase() ?? "B"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ms-text-primary">
              {displayName}
            </p>
            <p className="truncate text-xs text-ms-text-muted">@{author}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium text-white",
              BLUESKY_COLOR,
            )}
          >
            Bluesky
          </span>
        </div>

        {/* Post text */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="outline-none after:absolute after:inset-0 focus-visible:underline"
        >
          <p className="line-clamp-3 text-sm leading-relaxed text-ms-text-primary">
            {article.excerpt ?? article.title}
          </p>
        </a>

        {/* Engagement row */}
        <div className="mt-auto flex items-center gap-4 text-xs text-ms-text-muted">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden="true" />
            {formatCount(likes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Repeat2 className="size-3.5" aria-hidden="true" />
            {formatCount(reposts)}
          </span>
        </div>
      </div>

      {/* Hover action buttons */}
      <ActionButtons
        article={article}
        isBookmarked={isBookmarked}
        onBookmark={onBookmark}
        onHide={onHide}
      />
    </article>
  );
}

// ─── Shared action buttons ──────────────────────────────────────────

interface ActionButtonsProps {
  article: Article;
  isBookmarked: boolean;
  onBookmark?: (article: Article) => void;
  onHide?: (action: HideAction) => void;
}

/** Hover-visible action buttons (bookmark, share, hide dropdown) shared by all SNS cards. */
function ActionButtons({
  article,
  isBookmarked,
  onBookmark,
  onHide,
}: ActionButtonsProps) {
  const sourceLabel = SOURCE_LABELS[article.source];
  const keyword = extractKeyword(article.title);
  const [shareExpanded, setShareExpanded] = useState(false);

  const handleShareToggle = useCallback(() => {
    setShareExpanded((prev) => !prev);
  }, []);

  const handleCopied = useCallback(() => {
    toast.success("Copied!", { duration: 2000 });
  }, []);

  return (
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
          "flex size-7 items-center justify-center rounded-md backdrop-blur-sm transition-colors",
          "bg-ms-bg-primary/70 hover:bg-ms-accent/90 hover:text-white",
          isBookmarked ? "text-ms-accent" : "text-ms-text-secondary",
        )}
        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
      >
        <Star className="size-3.5" fill={isBookmarked ? "currentColor" : "none"} />
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
              "flex size-7 items-center justify-center rounded-md backdrop-blur-sm transition-colors",
              "bg-ms-bg-primary/70 text-ms-text-secondary hover:bg-ms-accent/90 hover:text-white",
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
  );
}

// ─── Main section ───────────────────────────────────────────────────

/**
 * SNS section combining Bluesky posts and YouTube videos.
 *
 * Bluesky cards display post text, author handle, and engagement metrics.
 * YouTube cards display video thumbnails with play button overlay, channel,
 * and view count. Desktop layout: 2 side-by-side sub-sections.
 */
export function SnsSection({
  blueskyArticles,
  youtubeArticles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
}: SnsSectionProps) {
  const hasBluesky = blueskyArticles.length > 0;
  const hasYoutube = youtubeArticles.length > 0;

  if (!hasBluesky && !hasYoutube) return null;

  return (
    <section aria-label="Social Media" className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Bluesky sub-section */}
        {hasBluesky && (
          <div className="flex flex-col gap-4">
            <SectionHeader icon="🦋" title="Bluesky" />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none sm:flex-col sm:overflow-x-visible sm:pb-0">
              {blueskyArticles.slice(0, 3).map((article) => (
                <div key={article.externalId} className="w-[72vw] shrink-0 sm:w-auto">
                  <BlueskyCard
                    article={article}
                    onBookmark={onBookmark}
                    onHide={onHide}
                    isBookmarked={bookmarkedIds.has(article.externalId)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* YouTube sub-section */}
        {hasYoutube && (
          <div className="flex flex-col gap-4">
            <SectionHeader icon="🎬" title="YouTube" />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none sm:flex-col sm:overflow-x-visible sm:pb-0">
              {youtubeArticles.slice(0, 3).map((article) => (
                <div key={article.externalId} className="w-[72vw] shrink-0 sm:w-auto">
                  <YouTubeCard
                    article={article}
                    onBookmark={onBookmark}
                    onHide={onHide}
                    isBookmarked={bookmarkedIds.has(article.externalId)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
