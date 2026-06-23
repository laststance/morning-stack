import { Suspense } from "react";
import type { Metadata } from "next";

import {
  getEdition,
  getLatestEdition,
  getWidgetData,
} from "@/lib/queries/edition";
import { getBookmarkedIds } from "@/app/actions/bookmarks";
import { getHiddenState } from "@/app/actions/hidden";
import { HomeContent } from "@/components/home-content";
import type { HomeContentProps } from "@/components/home-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { EditionType } from "@/lib/features/edition-slice";

// ─── Route Segment Config ───────────────────────────────────────────

/**
 * Force dynamic rendering — the home page queries the DB for the latest
 * edition on every request. Cannot be statically generated at build time
 * because no DATABASE_URL is available during `next build`.
 */
export const dynamic = "force-dynamic";

// ─── Metadata ───────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────

type HiddenState = NonNullable<HomeContentProps["hiddenState"]>;
type HomeSearchParams = Promise<{ edition?: string | string[] }>;

interface ResolvedEditionSelection {
  editionType: EditionType;
  isExplicitSelection: boolean;
}

const EMPTY_HIDDEN_STATE: HiddenState = {
  hiddenArticleIds: [],
  hiddenSources: [],
  hiddenTopics: [],
};

/**
 * Pick the first edition query value so tab navigation can request server data.
 * @param value - The raw `edition` search parameter from Next.js.
 * @param fallbackEditionType - The time-based edition used when the URL is absent or invalid.
 * @returns The selected edition plus whether the URL explicitly requested it.
 * @example
 * resolveEditionSearchParam("morning", "evening") // => { editionType: "morning", isExplicitSelection: true }
 * resolveEditionSearchParam("weekly", "evening") // => { editionType: "evening", isExplicitSelection: false }
 */
function resolveEditionSearchParam(
  value: string | string[] | undefined,
  fallbackEditionType: EditionType,
): ResolvedEditionSelection {
  const requestedEditionType = Array.isArray(value) ? value[0] : value;
  if (
    requestedEditionType === "morning" ||
    requestedEditionType === "evening"
  ) {
    return { editionType: requestedEditionType, isExplicitSelection: true };
  }
  return { editionType: fallbackEditionType, isExplicitSelection: false };
}

/**
 * Determine the default edition type when the home page loads without a tab query.
 * @returns `morning` before 12:00 JST, otherwise `evening`.
 * @example
 * const defaultEditionType = getDefaultEditionType();
 */
function getDefaultEditionType(): EditionType {
  const now = new Date();
  const tokyoHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
    }).format(now),
  );
  return tokyoHour < 12 ? "morning" : "evening";
}

/**
 * Get today's JST date for edition lookup triggered by the home page render.
 * @returns Date text formatted as `YYYY-MM-DD`.
 * @example
 * const today = getTodayJST();
 */
function getTodayJST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Convert a Map to a plain object so Server Components can pass grouped articles.
 * @param map - The source map keyed by string IDs.
 * @returns A serializable record containing the same entries.
 * @example
 * mapToRecord(new Map([["hackernews", []]])) // => { hackernews: [] }
 */
function mapToRecord<K extends string, V>(map: Map<K, V>): Record<string, V> {
  const record: Record<string, V> = {};
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
}

// ─── Page Component ─────────────────────────────────────────────────

/**
 * Render the public briefing and honor the edition query when a tab navigates.
 * @param props - Next.js route props containing async search params.
 * @returns The home page shell with Suspense-wrapped edition data.
 * @example
 * <HomePage searchParams={Promise.resolve({ edition: "morning" })} />
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const editionSelection = resolveEditionSearchParam(
    resolvedSearchParams.edition,
    getDefaultEditionType(),
  );

  return (
    <main className="relative mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
      <Suspense fallback={<HomePageSkeleton />}>
        <EditionContent
          editionType={editionSelection.editionType}
          allowLatestFallback={!editionSelection.isExplicitSelection}
        />
      </Suspense>
    </main>
  );
}

/**
 * Fetch all edition data while keeping public news independent from personalization.
 * @param editionType - The edition selected by URL or by JST default time.
 * @param allowLatestFallback - Whether missing same-day content may fall back to the latest published edition.
 * @returns Edition data when DB content exists, otherwise `null` for the no-edition state.
 * @example
 * const data = await fetchEditionData("morning", false);
 */
async function fetchEditionData(
  editionType: EditionType,
  allowLatestFallback: boolean,
) {
  try {
    const today = getTodayJST();

    const [requestedEdition, widgets, bookmarkedIds, hiddenState] =
      await Promise.all([
        getEdition(editionType, today),
        getWidgetData(),
        getSafeBookmarkedIds(),
        getSafeHiddenState(),
      ]);

    const edition =
      requestedEdition ??
      (allowLatestFallback ? await getLatestEdition() : null);

    if (!edition) return null;

    return { edition, widgets, bookmarkedIds, hiddenState };
  } catch {
    return null;
  }
}

/**
 * Read bookmark IDs without letting Auth.js configuration errors hide public editions.
 * @returns Bookmark IDs for signed-in users, or an empty list when unavailable.
 * @example
 * const bookmarkedIds = await getSafeBookmarkedIds();
 */
async function getSafeBookmarkedIds(): Promise<string[]> {
  try {
    return await getBookmarkedIds();
  } catch (error) {
    console.error(
      "[HomePage] Bookmark personalization unavailable; rendering public feed:",
      error,
    );
    return [];
  }
}

/**
 * Read hidden filters without letting Auth.js configuration errors hide public editions.
 * @returns Hidden filter state for signed-in users, or an empty state when unavailable.
 * @example
 * const hiddenState = await getSafeHiddenState();
 */
async function getSafeHiddenState(): Promise<HiddenState> {
  try {
    return await getHiddenState();
  } catch (error) {
    console.error(
      "[HomePage] Hidden-item personalization unavailable; rendering public feed:",
      error,
    );
    return EMPTY_HIDDEN_STATE;
  }
}

/**
 * Fetch and render the selected edition inside the page Suspense boundary.
 * @param props - The edition selection and fallback behavior for this render.
 * @returns The populated home content or the no-edition fallback.
 * @example
 * <EditionContent editionType="evening" allowLatestFallback={false} />
 */
async function EditionContent({
  editionType,
  allowLatestFallback,
}: {
  editionType: EditionType;
  allowLatestFallback: boolean;
}) {
  const data = await fetchEditionData(editionType, allowLatestFallback);

  if (!data) {
    return <NoEditionFallback />;
  }

  const { edition, widgets, bookmarkedIds, hiddenState } = data;

  return (
    <HomeContent
      editionType={edition.type}
      editionDate={edition.date}
      articlesBySource={mapToRecord(edition.articlesBySource)}
      allArticles={edition.allArticles}
      weather={widgets.weather}
      stocks={widgets.stocks}
      bookmarkedIds={bookmarkedIds}
      hiddenState={hiddenState}
    />
  );
}

// ─── Fallback Components ────────────────────────────────────────────

/**
 * Shown when no published editions exist in the database.
 */
function NoEditionFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-ms-text-primary text-2xl font-bold tracking-tight">
          No edition available
        </h2>
        <p className="text-ms-text-secondary mt-2">
          The next edition is being prepared. Check back soon!
        </p>
      </div>
    </div>
  );
}

/**
 * Full-page skeleton shown while the Suspense boundary resolves.
 *
 * Mirrors the approximate layout of the real content to minimize
 * Cumulative Layout Shift (CLS).
 */
function HomePageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero + Widgets row */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 lg:flex-[3]">
          <Skeleton className="aspect-[16/9] w-full rounded-lg lg:aspect-auto lg:h-[360px]" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-[1]">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>

      {/* Content sections row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-6 w-32" />
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-32 rounded-lg" />
            ))}
          </div>
        ))}
      </div>

      {/* SNS section */}
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-6 w-24" />
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-36 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
