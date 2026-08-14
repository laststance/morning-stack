import type { HiddenStateSnapshot } from "@/lib/personalization/hidden-state-snapshot";
import type { PersistedArticle } from "@/types/article";

/**
 * Applies the route's single hidden snapshot before HomePage serializes articles, using exact DB IDs for article-level filters.
 * @param articles - Public persisted articles from an edition query.
 * @param hiddenState - User-specific article/source/topic filters.
 * @returns Articles visible to that user in original ranking order.
 * @example
 * filterPersistedArticles([article], { hiddenArticleIds: [article.id], hiddenSources: [], hiddenTopics: [] }) // => []
 */
export function filterPersistedArticles(
  articles: PersistedArticle[],
  hiddenState: HiddenStateSnapshot,
): PersistedArticle[] {
  const hiddenArticleIds = new Set(hiddenState.hiddenArticleIds);
  const hiddenSources = new Set(hiddenState.hiddenSources);
  const hiddenTopics = hiddenState.hiddenTopics.map((topic) =>
    topic.toLowerCase(),
  );

  return articles.filter((article) => {
    if (hiddenArticleIds.has(article.id)) return false;
    if (hiddenSources.has(article.source)) return false;

    const normalizedTitle = article.title.toLowerCase();
    for (const hiddenTopic of hiddenTopics) {
      if (normalizedTitle.includes(hiddenTopic)) return false;
    }

    return true;
  });
}
