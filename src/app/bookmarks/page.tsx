import { Suspense } from "react";
import type { Metadata } from "next";

import { getBookmarks } from "@/app/actions/bookmarks";
import { BookmarksContent } from "@/components/bookmarks-content";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Route Segment Config ───────────────────────────────────────────

export const dynamic = "force-dynamic";

// ─── Metadata ───────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Your saved articles on MorningStack.",
};

// ─── Page Component ─────────────────────────────────────────────────

/**
 * Bookmarks page — shows all saved articles for the authenticated user.
 *
 * Protected by auth middleware in `src/middleware.ts` — unauthenticated
 * users are redirected to /login before this page renders.
 */
export default async function BookmarksPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ms-text-primary">
        Bookmarks
      </h1>
      <p className="mt-1 text-sm text-ms-text-secondary">
        Articles you&apos;ve saved for later.
      </p>

      <div className="mt-6">
        <Suspense fallback={<BookmarksSkeleton />}>
          <BookmarksList />
        </Suspense>
      </div>
    </main>
  );
}

// ─── Async data component ───────────────────────────────────────────

/** Fetches bookmarks server-side and passes to client component. */
async function BookmarksList() {
  const bookmarkedArticles = await getBookmarks();

  if (bookmarkedArticles.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-ms-text-primary">
            No bookmarks yet
          </p>
          <p className="mt-1 text-sm text-ms-text-muted">
            Click the star icon on any article to save it here.
          </p>
        </div>
      </div>
    );
  }

  return <BookmarksContent articles={bookmarkedArticles} />;
}

// ─── Skeleton ───────────────────────────────────────────────────────

/** Grid skeleton matching the bookmark card layout. */
function BookmarksSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );
}
