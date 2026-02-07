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
import { Skeleton } from "@/components/ui/skeleton";

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

/**
 * Determine the default edition type based on the current hour in Asia/Tokyo.
 *
 * Before 12:00 JST → morning, 12:00+ JST → evening.
 * Matches the logic in the cron collector.
 */
function getDefaultEditionType(): "morning" | "evening" {
  const now = new Date();
  const tokyoHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  return tokyoHour < 12 ? "morning" : "evening";
}

/**
 * Get today's date as YYYY-MM-DD in Asia/Tokyo timezone.
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
 * Convert a Map to a plain Record for serialization across the
 * React Server Component → Client Component boundary.
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
 * MorningStack home page — async Server Component.
 *
 * Fetches the current edition from the database based on time-of-day
 * (morning/evening) and today's date in JST. Falls back to the latest
 * published edition if none exists for today, or shows an empty state
 * message if no editions have been published at all.
 *
 * Widget data (weather, stocks) is fetched from Redis cache populated
 * by the cron collector.
 */
export default async function HomePage() {
  return (
    <main className="relative mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
      <Suspense fallback={<HomePageSkeleton />}>
        <EditionContent />
      </Suspense>
    </main>
  );
}

/**
 * Async data-fetching component wrapped in Suspense.
 *
 * Separated from the page export so that the Suspense boundary can
 * show a skeleton while the DB and Redis queries resolve.
 */
/**
 * Fetch all edition data, returning null on any failure.
 * Separated from JSX to satisfy react-hooks/error-boundaries lint rule.
 */
async function fetchEditionData() {
  try {
    const editionType = getDefaultEditionType();
    const today = getTodayJST();

    const [edition, widgets, bookmarkedIds, hiddenState] = await Promise.all([
      getEdition(editionType, today).then((e) => e ?? getLatestEdition()),
      getWidgetData(),
      getBookmarkedIds(),
      getHiddenState(),
    ]);

    if (!edition) return null;

    return { edition, widgets, bookmarkedIds, hiddenState };
  } catch {
    return null;
  }
}

async function EditionContent() {
  const data = await fetchEditionData();

  if (!data) {
    return <NoEditionFallback />;
  }

  const { edition, widgets, bookmarkedIds, hiddenState } = data;

  return (
    <HomeContent
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
        <h2 className="text-2xl font-bold tracking-tight text-ms-text-primary">
          No edition available
        </h2>
        <p className="mt-2 text-ms-text-secondary">
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
        <div className="order-first flex flex-col gap-4 lg:order-last lg:flex-[1]">
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
