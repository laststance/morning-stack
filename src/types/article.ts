/** Action dispatched when a user hides content from the feed. */
export interface HideAction {
  /** What kind of target is being hidden. */
  type: "article" | "source" | "topic";
  /** Identifier: externalId for articles, source name for sources, keyword for topics. */
  targetId: string;
}

/** Supported article source identifiers matching the DB enum. */
export type ArticleSource =
  | "hackernews"
  | "github"
  | "github_prs"
  | "reddit"
  | "producthunt"
  | "tech_rss"
  | "hatena"
  | "bluesky"
  | "youtube"
  | "world_news";

/**
 * A normalized article collected from any external source.
 *
 * Each data-source fetch function maps its API response into this
 * shape so that downstream code (edition builder, UI cards) can
 * handle every source uniformly.
 */
export interface Article {
  /** Source platform identifier. */
  source: ArticleSource;
  /** Article / post / repo headline. */
  title: string;
  /** Canonical URL pointing to the original content. */
  url: string;
  /** Optional thumbnail or preview image URL. */
  thumbnailUrl?: string;
  /** Short excerpt or description (typically 1–3 sentences). */
  excerpt?: string;
  /** Engagement score in the source's native unit (points, stars, upvotes…). */
  score: number;
  /** Unique identifier within the source platform. */
  externalId: string;
  /** Source-specific extra data (comments, author, language, etc.). */
  metadata: Record<string, unknown>;
}
