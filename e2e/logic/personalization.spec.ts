import { expect, test } from "@playwright/test";

import { filterPersistedArticles } from "@/lib/personalization/filter-persisted-articles";
import { loadPersonalization } from "@/lib/personalization/load-personalization";
import type { PersistedArticle } from "@/types/article";

const TODAY_ARTICLE: PersistedArticle = {
  id: "20000000-0000-4000-8000-000000000001",
  source: "hackernews",
  title: "Today's shared story",
  url: "https://example.com/today",
  score: 90,
  externalId: "shared-story",
  metadata: {},
};

const HISTORICAL_ARTICLE: PersistedArticle = {
  ...TODAY_ARTICLE,
  id: "20000000-0000-4000-8000-000000000002",
  title: "Historical shared story",
  url: "https://example.com/history",
};

test("article filters use persisted IDs so the same external story in another edition stays visible", () => {
  // Arrange
  const hiddenState = {
    hiddenArticleIds: [HISTORICAL_ARTICLE.id],
    hiddenSources: [],
    hiddenTopics: [],
  };

  // Act
  const visibleArticles = filterPersistedArticles(
    [TODAY_ARTICLE, HISTORICAL_ARTICLE],
    hiddenState,
  );

  // Assert
  expect(visibleArticles).toEqual([TODAY_ARTICLE]);
});

test("personalization failures expose an unavailable warning state without guessed bookmark or hidden labels", async () => {
  // Arrange
  const dependencies = {
    getUserId: async () => "e2e-user",
    getBookmarkedArticleIdsByUserId: async () => {
      throw new Error("bookmarks unavailable");
    },
    getHiddenStateByUserId: async () => ({
      hiddenArticleIds: [],
      hiddenSources: [],
      hiddenTopics: [],
    }),
  };

  // Act
  const personalization = await loadPersonalization(dependencies);

  // Assert
  expect(personalization).toEqual({ status: "unavailable" });
});

test("signed-out readers receive a known empty personalization state without requiring account queries", async () => {
  // Arrange
  const dependencies = {
    getUserId: async () => null,
    getBookmarkedArticleIdsByUserId: async () => {
      throw new Error("must not be required for public readers");
    },
    getHiddenStateByUserId: async () => {
      throw new Error("must not be required for public readers");
    },
  };

  // Act
  const personalization = await loadPersonalization(dependencies);

  // Assert
  expect(personalization).toEqual({
    status: "available",
    isSignedIn: false,
    bookmarkedArticleIds: [],
    hiddenState: {
      hiddenArticleIds: [],
      hiddenSources: [],
      hiddenTopics: [],
    },
  });
});

test("signed-in readers expose server-confirmed auth with persisted personalization", async () => {
  // Arrange
  const dependencies = {
    getUserId: async () => "e2e-user",
    getBookmarkedArticleIdsByUserId: async () => [TODAY_ARTICLE.id],
    getHiddenStateByUserId: async () => ({
      hiddenArticleIds: [],
      hiddenSources: ["reddit"],
      hiddenTopics: [],
    }),
  };

  // Act
  const personalization = await loadPersonalization(dependencies);

  // Assert
  expect(personalization).toEqual({
    status: "available",
    isSignedIn: true,
    bookmarkedArticleIds: [TODAY_ARTICLE.id],
    hiddenState: {
      hiddenArticleIds: [],
      hiddenSources: ["reddit"],
      hiddenTopics: [],
    },
  });
});
