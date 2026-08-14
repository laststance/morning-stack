import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBookmarkedArticleIdsByUserId } from "@/app/actions/bookmarks";
import { getHiddenStateByUserId } from "@/app/actions/hidden";
import { EditionDateNavigator } from "@/components/edition-date/edition-date-navigator";
import {
  HomeWarnings,
  MissingEditionState,
  UnavailableEditionState,
} from "@/components/home-feedback";
import { HomeContent } from "@/components/home-content";
import { HomeNavigationProvider } from "@/components/home-navigation-provider";
import { Header } from "@/components/layout/header";
import { TickerWrapper } from "@/components/layout/ticker-wrapper";
import { auth } from "@/lib/auth";
import { formatEditionDate } from "@/lib/edition-date/format-edition-date";
import { getDefaultEditionType } from "@/lib/edition-date/get-default-edition-type";
import { getTodayJst } from "@/lib/edition-date/get-today-jst";
import { getArchiveBoundaryRedirectHref } from "@/lib/edition-navigation/get-archive-boundary-redirect-href";
import { resolveHomeSearchParams } from "@/lib/edition-navigation/resolve-home-search-params";
import type { HomeSearchParams } from "@/lib/edition-navigation/resolved-home-selection";
import { filterEditionData } from "@/lib/personalization/filter-edition-data";
import { loadPersonalization } from "@/lib/personalization/load-personalization";
import {
  getEarliestPublishedEditionDate,
  getEdition,
  getLatestEdition,
  getWidgetData,
} from "@/lib/queries/edition";
import { loadEditionBounds } from "@/lib/queries/load-edition-bounds";
import {
  loadEditionContent,
  type FoundEditionContent,
} from "@/lib/queries/load-edition-content";
import { mapToRecord } from "@/lib/utils/map-to-record";

/** Home always reads current Postgres/auth/widget state at request time. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  openGraph: {
    title: "MorningStack - Your morning briefing, curated",
    description:
      "Curated tech news delivered twice daily. HackerNews, GitHub Trending, Reddit, and more — all in one place.",
  },
  twitter: {
    title: "MorningStack - Your morning briefing, curated",
    description:
      "Curated tech news delivered twice daily. HackerNews, GitHub Trending, Reddit, and more — all in one place.",
  },
};

/**
 * Resolves canonical URL state, independent bounds/content/personalization, and route-specific chrome whenever `/` renders.
 * @param props - Async App Router search params containing optional date/edition values.
 * @returns Current or historical article briefing with a server-confirmed Date Rail and recovery states.
 * @example
 * <HomePage searchParams={Promise.resolve({ date: "2030-01-14", edition: "morning" })} />
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const today = getTodayJst();
  const selection = resolveHomeSearchParams(
    await searchParams,
    today,
    getDefaultEditionType(),
  );

  // Redirect-based canonicalization must stay outside all query error boundaries.
  if (selection.redirectHref) redirect(selection.redirectHref);

  const contentPromise = loadEditionContent(selection, {
    getEdition,
    getLatestEdition,
    getWidgetData,
  });
  const personalizationPromise = loadPersonalization({
    getUserId: async () => {
      const session = await auth();
      return session?.user?.id ?? null;
    },
    getBookmarkedArticleIdsByUserId,
    getHiddenStateByUserId,
  });
  const bounds = await loadEditionBounds(getEarliestPublishedEditionDate);

  // The shared lower-bound redirect preserves edition type even if that type is missing there.
  if (bounds.status === "available" && bounds.earliestPublishedDate) {
    const boundaryRedirectHref = getArchiveBoundaryRedirectHref(
      selection,
      bounds.earliestPublishedDate,
    );
    if (boundaryRedirectHref) redirect(boundaryRedirectHref);
  }

  const [content, personalization] = await Promise.all([
    contentPromise,
    personalizationPromise,
  ]);
  const earliestPublishedDate =
    bounds.status === "available" ? bounds.earliestPublishedDate : null;

  return (
    <HomeNavigationProvider
      requestedDate={selection.requestedDate}
      requestedEditionType={selection.requestedEditionType}
    >
      {!selection.isHistoricalSelection && <TickerWrapper />}
      <Header
        requestedDate={selection.requestedDate}
        requestedEditionType={selection.requestedEditionType}
        isHistoricalSelection={selection.isHistoricalSelection}
      />
      <EditionDateNavigator
        requestedDate={selection.requestedDate}
        today={today}
        earliestPublishedDate={earliestPublishedDate}
      />

      <main className="relative mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <HomeWarnings
          isBoundsUnavailable={bounds.status === "unavailable"}
          isPersonalizationUnavailable={
            personalization.status === "unavailable"
          }
        />
        {content.status === "found" && content.isLatestFallback && (
          <p className="text-ms-text-secondary text-sm" role="status">
            Latest available: {formatEditionDate(content.edition.date)}{" "}
            {content.edition.type === "morning" ? "Morning" : "Evening"}
          </p>
        )}
        {renderEditionResult(
          content,
          personalization,
          selection.isHistoricalSelection,
          earliestPublishedDate,
        )}
      </main>
    </HomeNavigationProvider>
  );
}

/**
 * Renders the content discriminant after optional personalization filtering so missing/error copy never substitutes for query failures.
 * @param content - Required edition content result.
 * @param personalization - Optional bookmark/hidden state result.
 * @param isHistoricalSelection - Whether widgets must be forbidden.
 * @param earliestPublishedDate - Shared lower bound used by missing recovery.
 * @returns Found HomeContent, truthful missing state, or retryable unavailable state.
 * @example
 * renderEditionResult(content, personalization, true, "2030-01-12")
 */
function renderEditionResult(
  content: Awaited<ReturnType<typeof loadEditionContent>>,
  personalization: Awaited<ReturnType<typeof loadPersonalization>>,
  isHistoricalSelection: boolean,
  earliestPublishedDate: string | null,
) {
  if (content.status === "missing") {
    return (
      <MissingEditionState
        requestedDate={content.requestedDate}
        requestedEditionType={content.requestedEditionType}
        earliestPublishedDate={earliestPublishedDate}
      />
    );
  }

  if (content.status === "unavailable") return <UnavailableEditionState />;

  return renderFoundEdition(content, personalization, isHistoricalSelection);
}

/**
 * Enforces current-vs-historical HomeContent props after applying the same available hidden snapshot passed to Redux initialization.
 * @param content - Found exact or permitted latest-fallback edition.
 * @param personalization - Available snapshot or warning-only unavailable state.
 * @param isHistoricalSelection - URL-derived mode controlling widget omission.
 * @returns Discriminated HomeContent with persisted article IDs and optional personalization.
 * @example
 * renderFoundEdition(content, personalization, true)
 */
function renderFoundEdition(
  content: FoundEditionContent,
  personalization: Awaited<ReturnType<typeof loadPersonalization>>,
  isHistoricalSelection: boolean,
) {
  const edition =
    personalization.status === "available"
      ? filterEditionData(content.edition, personalization.hiddenState)
      : content.edition;
  const sharedProps = {
    isSignedIn:
      personalization.status === "available" && personalization.isSignedIn,
    articlesBySource: mapToRecord(edition.articlesBySource),
    allArticles: edition.allArticles,
    bookmarkedIds:
      personalization.status === "available"
        ? personalization.bookmarkedArticleIds
        : undefined,
    hiddenState:
      personalization.status === "available"
        ? personalization.hiddenState
        : undefined,
    personalizationStatus: personalization.status,
  };

  if (isHistoricalSelection) {
    return <HomeContent mode="historical" {...sharedProps} />;
  }

  // Current found content always carries widget data because the loader treats widget failure as unavailable.
  if (!content.widgets) return <UnavailableEditionState />;

  return (
    <HomeContent
      mode="current"
      weather={content.widgets.weather}
      stocks={content.widgets.stocks}
      {...sharedProps}
    />
  );
}
