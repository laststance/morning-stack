"use client";

import { useCallback, useState } from "react";
import { Ban, EyeOff, Star, Tag, X } from "lucide-react";
import { toast } from "sonner";

import { SOURCE_LABELS } from "@/components/cards/constants";
import { ShareMenu } from "@/components/cards/share-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { HideAction, PersistedArticle } from "@/types/article";

export interface ArticleActionsProps {
  /** Article whose bookmark, share, and hide actions are being rendered. */
  article: PersistedArticle;
  /** Called when the reader toggles this article's bookmark state. */
  onBookmark?: (article: PersistedArticle) => void;
  /** Called when the reader hides an article, source, or title keyword. */
  onHide?: (action: HideAction) => void;
  /** Whether this persisted article is currently bookmarked. */
  isBookmarked?: boolean;
  /** Adjusts icon scale without shrinking the 40px desktop or 44px touch target. */
  size?: "standard" | "compact";
  /** Optional noun used by specialized cards such as pull requests. */
  itemLabel?: "article" | "PR";
  /** Positioning classes supplied by the owning article presentation. */
  className?: string;
}

/**
 * Renders the single bookmark/share/hide contract whenever any article presentation exposes reader actions.
 * @returns Touch-safe actions that collapse to the shared compact desktop treatment.
 * @example
 * <ArticleActions article={article} onBookmark={handleBookmark} />
 */
export function ArticleActions({
  article,
  onBookmark,
  onHide,
  isBookmarked = false,
  size = "standard",
  itemLabel = "article",
  className,
}: ArticleActionsProps) {
  const [isShareExpanded, setIsShareExpanded] = useState(false);
  const sourceLabel = SOURCE_LABELS[article.source];
  const keyword = extractKeyword(article.title);
  const iconClassName = size === "compact" ? "size-3.5" : "size-4";

  const handleShareToggle = useCallback(() => {
    setIsShareExpanded((currentValue) => !currentValue);
  }, []);

  const handleCopied = useCallback(() => {
    toast.success("Copied!", { duration: 2000 });
  }, []);

  const actionClassName = cn(
    "glass-subtle flex size-11 items-center justify-center rounded-md transition-colors lg:size-10",
    "hover:bg-ms-accent/90 hover:text-white",
  );

  return (
    <div
      className={cn(
        "relative z-10 flex w-fit gap-1 opacity-100 transition-opacity",
        className,
      )}
      data-article-actions
    >
      <button
        type="button"
        disabled={!onBookmark}
        onClick={(event) => {
          event.stopPropagation();
          onBookmark?.(article);
        }}
        className={cn(
          actionClassName,
          isBookmarked ? "text-ms-accent" : "text-ms-text-secondary",
        )}
        aria-label={
          !onBookmark
            ? "Bookmark status unavailable"
            : isBookmarked
              ? "Remove bookmark"
              : "Bookmark article"
        }
      >
        <Star
          className={iconClassName}
          fill={isBookmarked ? "currentColor" : "none"}
        />
      </button>

      <ShareMenu
        article={article}
        isExpanded={isShareExpanded}
        onToggle={handleShareToggle}
        onCopied={handleCopied}
        size={size === "compact" ? "sm" : "md"}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={!onHide}
            onClick={(event) => event.stopPropagation()}
            className={cn(actionClassName, "text-ms-text-secondary")}
            aria-label={
              onHide ? "Hide options" : "Hidden preferences unavailable"
            }
          >
            <X className={iconClassName} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-ms-bg-secondary border-ms-border w-56"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            onClick={() => onHide?.({ type: "article", targetId: article.id })}
            className="text-ms-text-primary focus:bg-ms-bg-tertiary focus:text-ms-text-primary"
          >
            <EyeOff className="text-ms-text-muted size-4" />
            Hide this {itemLabel}
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
  );
}

/**
 * Selects a stable title keyword whenever ArticleActions builds the topic-hide option.
 * @returns A capitalized content word, first eligible word, or the first 20 title characters.
 * @example
 * extractKeyword("Show HN: A database") // => "Show"
 */
function extractKeyword(title: string): string {
  const words = title.split(/\s+/).filter((word) => word.length >= 3);
  const capitalizedWord = words.find(
    (word) =>
      /^[A-Z]/.test(word) &&
      !/^(The|And|For|How|Why|What|New|Top)$/i.test(word),
  );

  return capitalizedWord ?? words[0] ?? title.slice(0, 20);
}
