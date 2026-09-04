import { Suspense } from "react";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { getHiddenItems } from "@/app/actions/hidden";
import { SettingsContent } from "@/components/settings-content";
import { Skeleton } from "@/components/ui/skeleton";
import { getDefaultEditionType } from "@/lib/edition-date/get-default-edition-type";
import { getSavedEditionType } from "@/lib/edition-preference/get-saved-edition-type";

// ─── Route Segment Config ───────────────────────────────────────────

export const dynamic = "force-dynamic";

// ─── Metadata ───────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your MorningStack account and preferences.",
};

// ─── Page Component ─────────────────────────────────────────────────

/**
 * Renders the protected Settings shell whenever authenticated users manage account, hidden-item, and display preferences.
 * @returns Settings page with deferred account data and display preference controls.
 * @example
 * <SettingsPage />
 */
export default async function SettingsPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-ms-text-primary text-2xl font-bold tracking-tight">
        Settings
      </h1>
      <p className="text-ms-text-secondary mt-1 text-sm">
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

/**
 * Fetches Settings data whenever the Suspense boundary resolves so the client tabs receive server-confirmed state.
 * @returns SettingsContent seeded with session identity, hidden items, and default edition preference.
 * @example
 * <SettingsData />
 */
async function SettingsData() {
  const [session, hiddenItems, savedEditionType] = await Promise.all([
    auth(),
    getHiddenItems(),
    getSavedEditionType(),
  ]);

  return (
    <SettingsContent
      user={{
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
        image: session?.user?.image ?? null,
      }}
      hiddenItems={hiddenItems}
      defaultEditionType={savedEditionType ?? getDefaultEditionType()}
    />
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────

/**
 * Reserves the Settings data region only while the protected server data boundary is pending.
 * @returns Lightweight Settings placeholder cards.
 * @example
 * <SettingsSkeleton />
 */
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
