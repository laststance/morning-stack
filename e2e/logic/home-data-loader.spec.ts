import { expect, test } from "@playwright/test";

import { formatEditionContextLabel } from "@/components/edition-date/edition-date-navigator";
import { selectFeaturedStories } from "@/components/sections/hero-section";
import type { EditionData } from "@/lib/queries/edition";
import { loadEditionContent } from "@/lib/queries/load-edition-content";
import { loadEditionBounds } from "@/lib/queries/load-edition-bounds";
import { resolveHomeSearchParams } from "@/lib/edition-navigation/resolve-home-search-params";
import type { PersistedArticle } from "@/types/article";

const LATEST_EDITION: EditionData = {
  id: "10000000-0000-4000-8000-000000000001",
  type: "evening",
  date: "2030-01-14",
  articlesBySource: new Map(),
  allArticles: [],
};

test("implicit current briefing labels an older latest edition without changing requested date or type", async () => {
  // Arrange
  const selection = resolveHomeSearchParams({}, "2030-01-15", "morning");

  // Act
  const result = await loadEditionContent(selection, {
    getEdition: async () => null,
    getLatestEdition: async () => LATEST_EDITION,
    getWidgetData: async () => ({ weather: null, stocks: [] }),
  });

  // Assert
  expect(result).toEqual({
    status: "found",
    requestedDate: "2030-01-15",
    requestedEditionType: "morning",
    edition: LATEST_EDITION,
    widgets: { weather: null, stocks: [] },
    isLatestFallback: true,
  });
  expect(
    formatEditionContextLabel(result.requestedDate, "2030-01-15", {
      date: LATEST_EDITION.date,
      type: LATEST_EDITION.type,
    }),
  ).toBe("Latest available: Jan 14, 2030 Evening");
});

test("dedicated GitHub repositories and pull requests stay out of supporting headlines", () => {
  // Arrange
  const articles: PersistedArticle[] = [
    {
      id: "lead",
      source: "hackernews",
      title: "Lead",
      url: "https://example.com/lead",
      score: 100,
      externalId: "lead",
      metadata: {},
    },
    {
      id: "pull-request",
      source: "github_prs",
      title: "Pull request",
      url: "https://example.com/pull-request",
      score: 99,
      externalId: "pull-request",
      metadata: {},
    },
    {
      id: "repository",
      source: "github",
      title: "Repository",
      url: "https://example.com/repository",
      score: 98,
      externalId: "repository",
      metadata: {},
    },
    {
      id: "tech",
      source: "tech_rss",
      title: "Tech",
      url: "https://example.com/tech",
      score: 97,
      externalId: "tech",
      metadata: {},
    },
    {
      id: "reddit",
      source: "reddit",
      title: "Reddit",
      url: "https://example.com/reddit",
      score: 96,
      externalId: "reddit",
      metadata: {},
    },
    {
      id: "hatena",
      source: "hatena",
      title: "Hatena",
      url: "https://example.com/hatena",
      score: 95,
      externalId: "hatena",
      metadata: {},
    },
  ];

  // Act
  const result = selectFeaturedStories(articles);

  // Assert
  expect(result.leadArticle?.id).toBe("lead");
  expect(result.supportingArticles.map((article) => article.id)).toEqual([
    "tech",
    "reddit",
    "hatena",
  ]);
});

test("missing historical edition stays missing even when current-only widgets are unavailable", async () => {
  // Arrange
  const selection = resolveHomeSearchParams(
    { date: "2030-01-14", edition: "morning" },
    "2030-01-15",
    "evening",
  );

  // Act
  const result = await loadEditionContent(selection, {
    getEdition: async () => null,
    getLatestEdition: async () => LATEST_EDITION,
    getWidgetData: async () => {
      throw new Error("widgets unavailable");
    },
  });

  // Assert
  expect(result).toEqual({
    status: "missing",
    requestedDate: "2030-01-14",
    requestedEditionType: "morning",
  });
});

test("current edition remains readable when optional widget loading fails", async () => {
  // Arrange
  const selection = resolveHomeSearchParams(
    { edition: "evening" },
    "2030-01-15",
    "morning",
  );

  // Act
  const result = await loadEditionContent(selection, {
    getEdition: async () => LATEST_EDITION,
    getLatestEdition: async () => null,
    getWidgetData: async () => {
      throw new Error("widgets unavailable");
    },
  });

  // Assert
  expect(result).toEqual({
    status: "found",
    requestedDate: "2030-01-15",
    requestedEditionType: "evening",
    edition: LATEST_EDITION,
    widgets: null,
    isLatestFallback: false,
  });
});

test("edition query failures render retryable unavailable state instead of claiming content is missing", async () => {
  // Arrange
  const selection = resolveHomeSearchParams(
    { edition: "evening" },
    "2030-01-15",
    "morning",
  );

  // Act
  const result = await loadEditionContent(selection, {
    getEdition: async () => {
      throw new Error("database unavailable");
    },
    getLatestEdition: async () => LATEST_EDITION,
    getWidgetData: async () => ({ weather: null, stocks: [] }),
  });

  // Assert
  expect(result).toEqual({
    status: "unavailable",
    requestedDate: "2030-01-15",
    requestedEditionType: "evening",
  });
});

test("archive-bound failures stay independent so successfully loaded article content can remain readable", async () => {
  // Arrange
  const getEarliestPublishedEditionDate = async () => {
    throw new Error("bounds unavailable");
  };

  // Act
  const bounds = await loadEditionBounds(getEarliestPublishedEditionDate);

  // Assert
  expect(bounds).toEqual({ status: "unavailable" });
});
