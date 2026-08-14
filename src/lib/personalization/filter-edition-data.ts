import { filterPersistedArticles } from "@/lib/personalization/filter-persisted-articles";
import type { HiddenStateSnapshot } from "@/lib/personalization/hidden-state-snapshot";
import type { EditionData } from "@/lib/queries/edition";
import type { ArticleSource, PersistedArticle } from "@/types/article";

/**
 * Applies one authenticated hidden snapshot to both flat/grouped edition shapes before HomePage initializes the client.
 * @param edition - Public exact/fallback edition returned from Postgres.
 * @param hiddenState - User-specific filters loaded beside bookmark IDs.
 * @returns Edition metadata with consistently filtered flat and source-grouped articles.
 * @example
 * filterEditionData(edition, hiddenState)
 */
export function filterEditionData(
  edition: EditionData,
  hiddenState: HiddenStateSnapshot,
): EditionData {
  const allArticles = filterPersistedArticles(edition.allArticles, hiddenState);
  const articlesBySource = new Map<ArticleSource, PersistedArticle[]>();

  for (const article of allArticles) {
    const sourceArticles = articlesBySource.get(article.source) ?? [];
    sourceArticles.push(article);
    articlesBySource.set(article.source, sourceArticles);
  }

  return { ...edition, allArticles, articlesBySource };
}
