"use client";

import { useMemo, useState, useCallback } from "react";
import { Star, X, EyeOff, Ban, Tag } from "lucide-react";
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

// ─── Types ──────────────────────────────────────────────────────────

type PRTab = "open" | "merged";

export interface GitHubPRsSectionProps {
  /** GitHub PR articles to display. */
  articles: PersistedArticle[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked persisted article IDs. */
  bookmarkedIds?: Set<string>;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Repo display config with color-coded dot. */
const REPO_COLORS: Record<string, string> = {
  react: "bg-cyan-400",
  "next.js": "bg-white",
};

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

// ─── PR Card ────────────────────────────────────────────────────────

interface PRCardProps {
  article: PersistedArticle;
  onBookmark?: (article: PersistedArticle) => void;
  onHide?: (action: HideAction) => void;
  isBookmarked?: boolean;
}

/**
 * Pull request card with repo badge, PR number, title, author,
 * diff stats, labels, and state badge.
 */
function PRCard({
  article,
  onBookmark,
  onHide,
  isBookmarked = false,
}: PRCardProps) {
  const meta = article.metadata;
  const repo = meta.repo as string;
  const number = meta.number as number;
  const state = meta.state as "open" | "merged";
  const author = meta.author as string;
  const labels = (meta.labels as Array<{ name: string; color: string }>) ?? [];
  const additions = (meta.additions as number) ?? 0;
  const deletions = (meta.deletions as number) ?? 0;
  const draft = meta.draft as boolean;

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
    <article
      className={cn(
        "group relative flex flex-col gap-2 rounded-md p-3",
        "glass-panel",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        "focus-within:ring-ms-accent/50 focus-within:ring-2",
      )}
    >
      {/* Top row: repo badge + PR number + state badge */}
      <div className="flex items-center gap-2">
        {/* Repo badge */}
        <span className="text-ms-text-secondary inline-flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "size-2 rounded-full",
              REPO_COLORS[repo] ?? "bg-gray-400",
            )}
            aria-hidden="true"
          />
          <span className="font-medium">{repo}</span>
        </span>

        {/* PR number */}
        <span className="text-ms-text-muted font-mono text-xs">#{number}</span>

        {/* Draft indicator */}
        {draft && (
          <span className="bg-ms-bg-tertiary text-ms-text-muted rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-wider uppercase">
            Draft
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* State badge */}
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
            state === "open"
              ? "border border-emerald-500/50 text-emerald-400"
              : "bg-purple-500/20 text-purple-400",
          )}
        >
          {state}
        </span>
      </div>

      {/* Title */}
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

      {/* Bottom row: author + labels + diff stats */}
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
        {/* Author */}
        <span className="inline-flex items-center gap-1.5">
          {article.thumbnailUrl && (
            /* eslint-disable-next-line @next/next/no-img-element -- 20px avatar */
            <img
              src={article.thumbnailUrl}
              alt=""
              className="size-5 rounded-full object-cover"
            />
          )}
          <span className="text-ms-text-muted">{author}</span>
        </span>

        {/* Labels (up to 3) */}
        {labels.slice(0, 3).map((label) => (
          <span
            key={label.name}
            className="text-ms-text-secondary rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `#${label.color}30`,
              color: `#${label.color}`,
            }}
          >
            {label.name}
          </span>
        ))}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Diff stats */}
        {(additions > 0 || deletions > 0) && (
          <span className="font-mono text-xs">
            <span className="text-ms-positive">+{additions}</span>{" "}
            <span className="text-ms-negative">-{deletions}</span>
          </span>
        )}
      </div>

      {/* Hover action buttons */}
      <div
        className={cn(
          "absolute top-2 right-2 flex gap-1",
          "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
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
            "glass-subtle flex size-7 items-center justify-center rounded-md transition-colors",
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!onHide}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "glass-subtle flex size-7 items-center justify-center rounded-md transition-colors",
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
              Hide this PR
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

// ─── Main section ───────────────────────────────────────────────────

/**
 * GitHub Pull Requests section with Open/Merged tab switching.
 *
 * Displays recent PRs from facebook/react and vercel/next.js.
 * Each PR card shows repo badge, PR number, title, author,
 * labels, diff stats, and state badge. Bloomberg data-dense style.
 */
export function GitHubPRsSection({
  articles,
  onBookmark,
  onHide,
  bookmarkedIds = new Set(),
}: GitHubPRsSectionProps) {
  const [activeTab, setActiveTab] = useState<PRTab>("open");

  const filteredArticles = useMemo(
    () => articles.filter((a) => a.metadata.state === activeTab),
    [articles, activeTab],
  );

  if (articles.length === 0) return null;

  return (
    <section aria-label="Pull Requests" className="flex min-w-0 flex-col gap-3">
      <SectionHeader icon="🔀" title="Pull Requests" />

      {/* Tab switcher */}
      <div className="border-ms-border flex gap-4 border-b" role="tablist">
        {(["open", "merged"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-2 text-xs font-medium tracking-wider uppercase transition-colors",
              activeTab === tab
                ? "border-ms-accent text-ms-accent border-b-2"
                : "text-ms-text-muted hover:text-ms-text-secondary",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* PR list */}
      <div className="flex flex-col gap-2">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article) => (
            <PRCard
              key={article.id}
              article={article}
              onBookmark={onBookmark}
              onHide={onHide}
              isBookmarked={bookmarkedIds.has(article.id)}
            />
          ))
        ) : (
          <p className="text-ms-text-muted py-4 text-center text-xs">
            No {activeTab} pull requests
          </p>
        )}
      </div>
    </section>
  );
}
