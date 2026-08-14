/** Authenticated hidden filters loaded once so server filtering and client initialization use the same snapshot. */
export interface HiddenStateSnapshot {
  hiddenArticleIds: string[];
  hiddenSources: string[];
  hiddenTopics: string[];
}
