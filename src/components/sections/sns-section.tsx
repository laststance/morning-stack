"use client";

import Image from "next/image";
import { useState } from "react";
import { Eye, Heart, Play, Repeat2 } from "lucide-react";

import { ArticleActions } from "@/components/cards/article-actions";
import {
  ARTICLE_IMAGE_SIZES,
  SOURCE_BADGE_TEXT_COLORS,
  SOURCE_COLORS,
} from "@/components/cards/constants";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/sections/section-header";
import type { PersistedArticle, HideAction } from "@/types/article";

// ─── Props ──────────────────────────────────────────────────────────

export interface SnsSectionProps {
  /** Bluesky posts to display (up to 3). */
  blueskyArticles: PersistedArticle[];
  /** YouTube videos to display (up to 3). */
  youtubeArticles: PersistedArticle[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option from the dropdown. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Formats source engagement whenever a social card displays compact counts. */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── YouTube Card ───────────────────────────────────────────────────

interface YouTubeCardProps {
  article: PersistedArticle;
  onBookmark?: (article: PersistedArticle) => void;
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
        "group relative flex h-full flex-col overflow-hidden rounded-md",
        "border-ms-border/50 bg-ms-bg-secondary border",
        "transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
        "hover:border-ms-border hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        "focus-within:ring-ms-accent/50 focus-within:ring-2",
      )}
      data-article-variant="video-rail"
    >
      {/* Thumbnail with play overlay */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-ms-bg-tertiary relative block aspect-video w-full overflow-hidden"
        aria-label={`Watch: ${article.title}`}
      >
        {article.thumbnailUrl && !imgError ? (
          <Image
            src={article.thumbnailUrl}
            alt=""
            fill
            sizes={ARTICLE_IMAGE_SIZES["video-rail"]}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="text-ms-text-muted flex h-full items-center justify-center">
            <Play className="size-10" />
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full",
              "bg-red-600/80 text-white shadow-lg backdrop-blur-sm",
              "transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            )}
          >
            <Play className="size-5 fill-current" />
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {duration}
          </span>
        )}

        {/* Source brand bar */}
        <span
          className={cn(
            "absolute bottom-0 left-0 h-0.5 w-full",
            SOURCE_COLORS.youtube,
          )}
          aria-hidden="true"
        />
      </a>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-ms-text-primary line-clamp-2 text-sm leading-snug font-medium">
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

        <div className="text-ms-text-muted mt-auto flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium",
              SOURCE_COLORS.youtube,
              SOURCE_BADGE_TEXT_COLORS.youtube,
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

      {/* Shared action row remains reachable by touch and collapses to hover treatment on desktop. */}
      <ArticleActions
        article={article}
        isBookmarked={isBookmarked}
        onBookmark={onBookmark}
        onHide={onHide}
        size="compact"
        className="mr-1 mb-3 ml-auto lg:absolute lg:top-2 lg:right-2 lg:m-0 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
      />
    </article>
  );
}

// ─── Bluesky Card ───────────────────────────────────────────────────

interface BlueskyCardProps {
  article: PersistedArticle;
  onBookmark?: (article: PersistedArticle) => void;
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
        "group relative flex h-full flex-col overflow-hidden rounded-md",
        "border-ms-border/50 bg-ms-bg-secondary border",
        "transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
        "hover:border-ms-border hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        "focus-within:ring-ms-accent/50 focus-within:ring-2",
      )}
      data-article-variant="social-post"
    >
      {/* Source brand bar (top) */}
      <span
        className={cn("h-0.5 w-full shrink-0", SOURCE_COLORS.bluesky)}
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
            <p className="text-ms-text-primary truncate text-sm font-medium">
              {displayName}
            </p>
            <p className="text-ms-text-muted truncate text-xs">@{author}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium",
              SOURCE_COLORS.bluesky,
              SOURCE_BADGE_TEXT_COLORS.bluesky,
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
          data-article-headline
          className="outline-none after:absolute after:inset-0 focus-visible:underline"
        >
          <p className="text-ms-text-primary line-clamp-3 text-base leading-relaxed">
            {article.excerpt ?? article.title}
          </p>
        </a>

        {/* Engagement row */}
        <div className="text-ms-text-muted mt-auto flex items-center gap-4 text-xs">
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

      {/* Shared action row remains reachable by touch and collapses to hover treatment on desktop. */}
      <ArticleActions
        article={article}
        isBookmarked={isBookmarked}
        onBookmark={onBookmark}
        onHide={onHide}
        size="compact"
        className="mr-1 mb-3 ml-auto lg:absolute lg:top-2 lg:right-2 lg:m-0 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
      />
    </article>
  );
}

// ─── Main section ───────────────────────────────────────────────────

/**
 * Renders Bluesky and YouTube as independent editorial bands so either source can grow or disappear without leaving a gap.
 * @param props - Source articles, personalization actions, and bookmark state supplied by the home edition.
 * @returns Nothing when both sources are empty, otherwise one full-width social media section.
 * @example
 * <SnsSection blueskyArticles={posts} youtubeArticles={videos} />
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
    <section
      aria-label="Social Media"
      className="flex min-w-0 flex-col gap-8"
      data-layout="editorial-band"
    >
      <div className="flex flex-col gap-8">
        {/* Bluesky sub-section */}
        {hasBluesky && (
          <div className="flex min-w-0 flex-col gap-4">
            <SectionHeader title="Bluesky" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {blueskyArticles.slice(0, 3).map((article) => (
                <div key={article.id} className="h-full">
                  <BlueskyCard
                    article={article}
                    onBookmark={onBookmark}
                    onHide={onHide}
                    isBookmarked={bookmarkedIds.has(article.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* YouTube sub-section */}
        {hasYoutube && (
          <div className="flex min-w-0 flex-col gap-4">
            <SectionHeader title="YouTube" />
            <div
              className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-x-visible sm:pb-0 md:grid-cols-3"
              data-layout="video-rail"
            >
              {youtubeArticles.slice(0, 3).map((article) => (
                <div
                  key={article.id}
                  className="h-full w-[86vw] max-w-md shrink-0 snap-start scroll-ml-4 sm:w-auto sm:max-w-none"
                >
                  <YouTubeCard
                    article={article}
                    onBookmark={onBookmark}
                    onHide={onHide}
                    isBookmarked={bookmarkedIds.has(article.id)}
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
