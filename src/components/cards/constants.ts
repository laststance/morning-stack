import type { ArticleSource } from "@/types/article";

/** Source-specific brand colors shared by every article presentation. */
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

/** Source-specific foreground colors keep 12px badge labels above WCAG AA contrast. */
export const SOURCE_BADGE_TEXT_COLORS: Record<ArticleSource, string> = {
  hackernews: "text-black",
  github: "text-black",
  github_prs: "text-black",
  reddit: "text-black",
  producthunt: "text-black",
  tech_rss: "text-black",
  hatena: "text-black",
  bluesky: "text-black",
  youtube: "text-white",
  world_news: "text-black",
};

/** Human-readable source labels shared by cards, rows, and action menus. */
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

/** Article presentation variants keep composition and responsive image hints on one contract. */
export type ArticleCardPresentation =
  | "standard"
  | "wide"
  | "media-two-column"
  | "media-three-column"
  | "compact";

/** Responsive image selection hints matching each media-bearing article presentation. */
export const ARTICLE_IMAGE_SIZES: Record<
  ArticleCardPresentation | "lead" | "video-rail",
  string
> = {
  standard:
    "(max-width: 639px) 88vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 380px",
  wide: "(max-width: 1023px) 100vw, 600px",
  "media-two-column":
    "(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 590px",
  "media-three-column":
    "(max-width: 639px) 100vw, (max-width: 767px) 50vw, (max-width: 1279px) 33vw, 380px",
  compact: "100vw",
  lead: "(max-width: 1023px) 100vw, 760px",
  "video-rail":
    "(max-width: 639px) 86vw, (max-width: 767px) 50vw, (max-width: 1279px) 33vw, 380px",
};
