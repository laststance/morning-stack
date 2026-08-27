"use client";

import { useMemo, useState } from "react";

import { ArticleActions } from "@/components/cards/article-actions";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/sections/section-header";
import type { PersistedArticle, HideAction } from "@/types/article";

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

/** Maps supported repositories to their compact identity dot whenever a PR card renders. */
const REPO_COLORS: Record<string, string> = {
  react: "bg-cyan-400",
  "next.js": "bg-white",
};

// ─── PR Card ────────────────────────────────────────────────────────

interface PRCardProps {
  article: PersistedArticle;
  onBookmark?: (article: PersistedArticle) => void;
  onHide?: (action: HideAction) => void;
  isBookmarked?: boolean;
}

/**
 * Renders a pull-request summary with always-available touch actions and compact hover actions on desktop.
 * @param props - Persisted PR metadata, bookmark state, and optional personalization callbacks.
 * @returns A data-dense PR card with repository, status, labels, diff, and article actions.
 * @example
 * <PRCard article={article} isBookmarked={false} />
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

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-2 rounded-md p-3",
        "glass-panel",
        "transition-[box-shadow,transform] duration-200 motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        "focus-within:ring-ms-accent/50 focus-within:ring-2",
      )}
      data-article-variant="pull-request"
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

      <ArticleActions
        article={article}
        onBookmark={onBookmark}
        onHide={onHide}
        isBookmarked={isBookmarked}
        itemLabel="PR"
        size="compact"
        className="ml-auto lg:absolute lg:top-2 lg:right-2 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
      />
    </article>
  );
}

// ─── Main section ───────────────────────────────────────────────────

/**
 * Renders filtered pull requests as a compact two-column desktop queue whenever its tab changes.
 * @param props - Persisted PRs and optional personalization callbacks.
 * @returns A tabbed PR band with one mobile column and balanced desktop pairs.
 * @example
 * <GitHubPRsSection articles={articles} />
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
  const hasOddArticleCount = filteredArticles.length % 2 === 1;

  if (articles.length === 0) return null;

  return (
    <section
      aria-label="Pull Requests"
      className="flex min-w-0 flex-col gap-3"
      data-layout="editorial-band"
    >
      <SectionHeader title="Pull Requests" />

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
              "min-h-11 px-3 text-xs font-medium tracking-wider uppercase transition-colors",
              activeTab === tab
                ? "border-ms-accent text-ms-accent border-b-2"
                : "text-ms-text-muted hover:text-ms-text-secondary",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* PR cards retain their queue density while using the otherwise empty second desktop column. */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article, articleIndex) => (
            <div
              key={article.id}
              className={cn(
                hasOddArticleCount &&
                  articleIndex === filteredArticles.length - 1 &&
                  "lg:col-span-2",
              )}
            >
              <PRCard
                article={article}
                onBookmark={onBookmark}
                onHide={onHide}
                isBookmarked={bookmarkedIds.has(article.id)}
              />
            </div>
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
