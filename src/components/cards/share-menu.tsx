"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/article";

// ─── Inline SVG icons for X and Bluesky (no extra dependency) ─────

/** X (formerly Twitter) brand icon. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Bluesky butterfly brand icon. */
function BlueskyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.643 3.593 3.519 6.178 3.279-4.554.757-8.553 3.042-5.308 8.392C3.182 24.2 5.58 22.4 7.44 21.174c3.762-2.48 5.793-6.08 4.56-9.374l.001-.001-.001.001c-1.233 3.294.798 6.894 4.56 9.374C18.42 22.4 20.818 24.2 22.506 21.918c3.245-5.35-.754-7.635-5.308-8.392 2.585.24 5.393-.636 6.178-3.279C23.622 9.418 24 4.458 24 3.768c0-.688-.139-1.86-.902-2.203-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8" />
    </svg>
  );
}

// ─── Props ──────────────────────────────────────────────────────────

export interface ShareMenuProps {
  /** The article to share. */
  article: Article;
  /** Whether this menu is currently expanded. */
  isExpanded: boolean;
  /** Called to toggle the expanded state. */
  onToggle: () => void;
  /** Called after a successful copy-to-clipboard. */
  onCopied?: () => void;
  /** Size variant matching the parent's button sizing. */
  size?: "sm" | "md";
  /** Extra CSS classes for the root container. */
  className?: string;
}

/**
 * Expandable share menu for article cards.
 *
 * Default state: single share icon button.
 * Expanded state: X icon, Bluesky icon, Copy Link icon — animated
 * left-to-right with a spring-like width transition.
 *
 * Closes when clicking outside the menu.
 */
export function ShareMenu({
  article,
  isExpanded,
  onToggle,
  onCopied,
  size = "md",
  className,
}: ShareMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const btnSize = size === "sm" ? "size-7" : "size-8";
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  // ── Click-outside handler ──
  useEffect(() => {
    if (!isExpanded) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onToggle();
      }
    }

    // Delay listener to avoid the same click that opened it from closing it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, onToggle]);

  /** Share to X (Twitter). */
  const shareToX = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const params = new URLSearchParams({
        text: article.title,
        url: article.url,
      });
      window.open(
        `https://twitter.com/intent/tweet?${params.toString()}`,
        "_blank",
        "noopener,noreferrer",
      );
    },
    [article.title, article.url],
  );

  /** Share to Bluesky. */
  const shareToBluesky = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = `${article.title} ${article.url}`;
      const params = new URLSearchParams({ text });
      window.open(
        `https://bsky.app/intent/compose?${params.toString()}`,
        "_blank",
        "noopener,noreferrer",
      );
    },
    [article.title, article.url],
  );

  /** Copy article URL to clipboard. */
  const copyLink = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(article.url);
        setCopied(true);
        onCopied?.();
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback: some browsers block clipboard in non-secure contexts
        onCopied?.();
      }
    },
    [article.url, onCopied],
  );

  const buttonBase = cn(
    "flex items-center justify-center rounded-md backdrop-blur-sm transition-colors",
    "bg-ms-bg-primary/70 text-ms-text-secondary hover:bg-ms-accent/90 hover:text-white",
    btnSize,
  );

  return (
    <div ref={containerRef} className={cn("flex gap-1", className)}>
      {/* Expanded share targets — animate in from right */}
      {isExpanded && (
        <div className="flex animate-in slide-in-from-right-2 fade-in gap-1 duration-200">
          <button
            type="button"
            onClick={shareToX}
            className={buttonBase}
            aria-label="Share to X"
          >
            <XIcon className={iconSize} />
          </button>

          <button
            type="button"
            onClick={shareToBluesky}
            className={buttonBase}
            aria-label="Share to Bluesky"
          >
            <BlueskyIcon className={iconSize} />
          </button>

          <button
            type="button"
            onClick={copyLink}
            className={cn(buttonBase, copied && "text-green-400")}
            aria-label={copied ? "Link copied" : "Copy link"}
          >
            {copied ? (
              <Check className={iconSize} />
            ) : (
              <Link2 className={iconSize} />
            )}
          </button>
        </div>
      )}

      {/* Share toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          buttonBase,
          isExpanded && "bg-ms-accent/90 text-white",
        )}
        aria-label={isExpanded ? "Close share menu" : "Share article"}
        aria-expanded={isExpanded}
      >
        <Share2 className={iconSize} />
      </button>
    </div>
  );
}
