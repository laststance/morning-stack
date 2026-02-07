"use client";

import { useMemo, useState, useCallback } from "react";
import { Star, X, EyeOff, Ban, Tag } from "lucide-react";
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

// ─── Types ──────────────────────────────────────────────────────────

type PRTab = "open" | "merged";

export interface GitHubPRsSectionProps {
  /** GitHub PR articles to display. */
  articles: Article[];
  /** Called when the user clicks the bookmark button. */
  onBookmark?: (article: Article) => void;
  /** Called when the user selects a hide option. */
  onHide?: (action: HideAction) => void;
  /** Set of bookmarked article external IDs. */
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
  article: Article;
  onBookmark?: (article: Article) => void;
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
        "focus-within:ring-2 focus-within:ring-ms-accent/50",
      )}
    >
      {/* Top row: repo badge + PR number + state badge */}
      <div className="flex items-center gap-2">
        {/* Repo badge */}
        <span className="inline-flex items-center gap-1.5 text-xs text-ms-text-secondary">
          <span
            className={cn("size-2 rounded-full", REPO_COLORS[repo] ?? "bg-gray-400")}
            aria-hidden="true"
          />
          <span className="font-medium">{repo}</span>
        </span>

        {/* PR number */}
        <span className="font-mono text-xs text-ms-text-muted">#{number}</span>

        {/* Draft indicator */}
        {draft && (
          <span className="rounded-sm bg-ms-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ms-text-muted">
            Draft
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* State badge */}
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            state === "open"
              ? "border border-emerald-500/50 text-emerald-400"
              : "bg-purple-500/20 text-purple-400",
          )}
        >
          {state}
        </span>
      </div>

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
            className="rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-ms-text-secondary"
            style={{ backgroundColor: `#${label.color}30`, color: `#${label.color}` }}
          >
            {label.name}
          </span>
        ))}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Diff stats */}
        {(additions > 0 || deletions > 0) && (
          <span className="font-mono text-xs">
            <span className="text-ms-positive">+{additions}</span>
            {" "}
            <span className="text-ms-negative">-{deletions}</span>
          </span>
        )}
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
          <Star className="size-3.5" fill={isBookmarked ? "currentColor" : "none"} />
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
              Hide this PR
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
    <section aria-label="Pull Requests" className="flex flex-col gap-3">
      <SectionHeader icon="🔀" title="Pull Requests" />

      {/* Tab switcher */}
      <div className="flex gap-4 border-b border-ms-border" role="tablist">
        {(["open", "merged"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-2 text-xs font-medium uppercase tracking-wider transition-colors",
              activeTab === tab
                ? "border-b-2 border-ms-accent text-ms-accent"
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
              key={article.externalId}
              article={article}
              onBookmark={onBookmark}
              onHide={onHide}
              isBookmarked={bookmarkedIds.has(article.externalId)}
            />
          ))
        ) : (
          <p className="py-4 text-center text-xs text-ms-text-muted">
            No {activeTab} pull requests
          </p>
        )}
      </div>
    </section>
  );
}
