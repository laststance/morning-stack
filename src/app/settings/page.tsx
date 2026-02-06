import { Suspense } from "react";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { getHiddenItems } from "@/app/actions/hidden";
import { SettingsContent } from "@/components/settings-content";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Route Segment Config ───────────────────────────────────────────

export const dynamic = "force-dynamic";

// ─── Metadata ───────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your MorningStack account and preferences.",
};

// ─── Page Component ─────────────────────────────────────────────────

/**
 * Settings page — Account info, Hidden Items management, Display Preferences.
 *
 * Protected by auth middleware in `src/middleware.ts` — unauthenticated
 * users are redirected to /login before this page renders.
 */
export default async function SettingsPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ms-text-primary">
        Settings
      </h1>
      <p className="mt-1 text-sm text-ms-text-secondary">
        Manage your account and preferences.
      </p>

      <div className="mt-6">
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsData />
        </Suspense>
      </div>
    </main>
  );
}

// ─── Async data component ───────────────────────────────────────────

/** Fetches session + hidden items and passes to client component. */
async function SettingsData() {
  const [session, hiddenItems] = await Promise.all([
    auth(),
    getHiddenItems(),
  ]);

  return (
    <SettingsContent
      user={{
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
        image: session?.user?.image ?? null,
      }}
      hiddenItems={hiddenItems}
    />
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────

/** Skeleton matching the settings layout during Suspense. */
function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-80 rounded-lg" />
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
}
