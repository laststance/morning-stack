"use client";

import {
  useOptimistic,
  useState,
  useTransition,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { saveDefaultEditionPreference } from "@/app/actions/edition-preference";
import { useAppDispatch } from "@/lib/hooks";
import { setEditionType, type EditionType } from "@/lib/features/edition-slice";
import { unhideItem, type HiddenItem } from "@/app/actions/hidden";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** No-op subscribe for useSyncExternalStore — value never changes. */
const emptySubscribe = () => () => {};

/** Props for the SettingsContent client component. */
interface SettingsContentProps {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  hiddenItems: HiddenItem[];
  defaultEditionType: EditionType;
}

/**
 * Renders Settings tabs whenever the protected server page has session, hidden-item, and display-preference data ready.
 * @param props - User profile, hidden items, and the server-confirmed default edition.
 * @returns Tabbed Account, Hidden Items, and Display Preferences sections.
 * @example
 * <SettingsContent user={user} hiddenItems={[]} defaultEditionType="morning" />
 */
export function SettingsContent({
  user,
  hiddenItems,
  defaultEditionType,
}: SettingsContentProps) {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="account" className="cursor-pointer">
          Account
        </TabsTrigger>
        <TabsTrigger value="hidden" className="cursor-pointer">
          Hidden Items
        </TabsTrigger>
        <TabsTrigger value="display" className="cursor-pointer">
          Display
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="mt-4">
        <AccountSection user={user} />
      </TabsContent>

      <TabsContent value="hidden" className="mt-4">
        <HiddenItemsSection initialItems={hiddenItems} />
      </TabsContent>

      <TabsContent value="display" className="mt-4">
        <DisplayPreferencesSection defaultEditionType={defaultEditionType} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Account Section ────────────────────────────────────────────────

/**
 * Shows account identity details whenever the Account tab is active so signed-in users can verify the current session.
 * @param props - Authenticated user's display name, email, and optional avatar.
 * @returns Account card with identity details and sign-out action.
 * @example
 * <AccountSection user={{ name: "Ada", email: "ada@example.com", image: null }} />
 */
function AccountSection({ user }: { user: SettingsContentProps["user"] }) {
  return (
    <Card className="border-ms-border bg-ms-bg-secondary">
      <CardHeader>
        <CardTitle className="text-ms-text-primary">Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? "User avatar"}
              className="size-16 rounded-full"
            />
          ) : (
            <div className="bg-ms-bg-tertiary text-ms-text-muted flex size-16 items-center justify-center rounded-full text-xl font-bold">
              {user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-ms-text-primary truncate text-lg font-medium">
              {user.name ?? "Unknown"}
            </p>
            <p className="text-ms-text-secondary truncate text-sm">
              {user.email ?? "No email"}
            </p>
          </div>
        </div>

        <div className="border-ms-border border-t pt-4">
          <Button
            variant="outline"
            className="border-ms-border text-ms-text-primary hover:bg-ms-bg-tertiary cursor-pointer"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Hidden Items Section ───────────────────────────────────────────

/** Label map for hidden item target types. */
const TARGET_TYPE_LABELS: Record<HiddenItem["targetType"], string> = {
  article: "Article",
  source: "Source",
  topic: "Topic",
};

/** Icon map for hidden item target types. */
const TARGET_TYPE_ICONS: Record<HiddenItem["targetType"], string> = {
  article: "📄",
  source: "📡",
  topic: "🏷️",
};

/**
 * Groups hidden personalization targets whenever the Hidden Items tab renders so users can restore individual filters.
 * @param props - Hidden items fetched for the current user.
 * @returns Empty state or grouped hidden-item controls with optimistic unhide behavior.
 * @example
 * <HiddenItemsSection initialItems={hiddenItems} />
 */
function HiddenItemsSection({ initialItems }: { initialItems: HiddenItem[] }) {
  const router = useRouter();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const visibleItems = initialItems.filter((item) => !removedIds.has(item.id));

  /**
   * Removes a hidden item immediately when its Unhide button is clicked, then refreshes server data after persistence.
   * @param item - Hidden article, source, or topic selected by the user.
   * @returns Resolves after the server action succeeds or the optimistic removal is reverted.
   * @example
   * await handleUnhide(hiddenItems[0])
   */
  async function handleUnhide(item: HiddenItem): Promise<void> {
    setRemovedIds((prev) => new Set(prev).add(item.id));

    const result = await unhideItem(item.targetType, item.targetId);

    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      // Revert on failure
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  if (visibleItems.length === 0) {
    return (
      <Card className="border-ms-border bg-ms-bg-secondary">
        <CardHeader>
          <CardTitle className="text-ms-text-primary">Hidden Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[20vh] items-center justify-center">
            <div className="text-center">
              <p className="text-ms-text-muted text-sm">
                No hidden items. Articles, sources, or topics you hide will
                appear here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group items by type for organized display
  const grouped = {
    source: visibleItems.filter((i) => i.targetType === "source"),
    topic: visibleItems.filter((i) => i.targetType === "topic"),
    article: visibleItems.filter((i) => i.targetType === "article"),
  };

  return (
    <Card className="border-ms-border bg-ms-bg-secondary">
      <CardHeader>
        <CardTitle className="text-ms-text-primary">
          Hidden Items
          <span className="text-ms-text-muted ml-2 text-sm font-normal">
            ({visibleItems.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(["source", "topic", "article"] as const).map((type) => {
          const items = grouped[type];
          if (items.length === 0) return null;

          return (
            <div key={type}>
              <h3 className="text-ms-text-secondary mb-2 text-sm font-medium">
                {TARGET_TYPE_ICONS[type]} {TARGET_TYPE_LABELS[type]}s (
                {items.length})
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="border-ms-border bg-ms-bg-tertiary flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-ms-text-primary truncate text-sm">
                        {item.targetId}
                      </p>
                      <p className="text-ms-text-muted text-xs">
                        Hidden {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-ms-border text-ms-text-secondary hover:bg-ms-bg-primary hover:text-ms-text-primary ml-4 shrink-0 cursor-pointer"
                      disabled={isPending}
                      onClick={() => handleUnhide(item)}
                    >
                      Unhide
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Display Preferences Section ────────────────────────────────────

/**
 * Renders browser-persisted theme and default-edition controls whenever the Display settings tab is active.
 * @param props - Server-confirmed edition preference used to seed the optimistic control.
 * @returns Display-preference cards for theme and default Home edition.
 * @example
 * <DisplayPreferencesSection defaultEditionType="evening" />
 */
function DisplayPreferencesSection({
  defaultEditionType,
}: {
  defaultEditionType: EditionType;
}) {
  const { theme, setTheme: setNextTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const dispatch = useAppDispatch();
  const [optimisticEditionType, setOptimisticEditionType] =
    useOptimistic(defaultEditionType);
  const [isEditionPreferencePending, startEditionPreferenceTransition] =
    useTransition();

  const themeOptions: { value: string; label: string; icon: string }[] = [
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "light", label: "Light", icon: "☀️" },
    { value: "system", label: "System", icon: "💻" },
  ];

  const editionOptions: { value: EditionType; label: string; icon: string }[] =
    [
      { value: "morning", label: "Morning", icon: "☀️" },
      { value: "evening", label: "Evening", icon: "🌙" },
    ];

  /**
   * Applies the visible choice immediately while the Settings server action persists its browser cookie.
   * @param editionType - Morning or Evening option selected by the user.
   * @returns Nothing; React settles the optimistic value from refreshed server props.
   * @example
   * handleEditionPreferenceChange("evening")
   */
  function handleEditionPreferenceChange(editionType: EditionType): void {
    startEditionPreferenceTransition(async () => {
      setOptimisticEditionType(editionType);

      try {
        const savedPreference = await saveDefaultEditionPreference(editionType);
        dispatch(setEditionType(savedPreference.editionType));
      } catch {
        toast.error("Couldn't save the default edition. Try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Theme Preference */}
      <Card className="border-ms-border bg-ms-bg-secondary">
        <CardHeader>
          <CardTitle className="text-ms-text-primary">Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((option) => {
              const isActive = mounted && theme === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer ${
                    isActive
                      ? "bg-ms-accent hover:bg-ms-accent/90 text-white"
                      : "border-ms-border text-ms-text-secondary hover:bg-ms-bg-tertiary hover:text-ms-text-primary"
                  }`}
                  onClick={() => setNextTheme(option.value)}
                >
                  <span aria-hidden="true">{option.icon}</span> {option.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Default Edition */}
      <Card className="border-ms-border bg-ms-bg-secondary">
        <CardHeader>
          <CardTitle className="text-ms-text-primary">
            Default Edition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-ms-text-muted mb-3 text-sm">
            Used when the Home URL does not select an edition. Saved in this
            browser and kept after sign-out.
          </p>
          <div className="flex gap-2">
            {editionOptions.map((option) => (
              <Button
                key={option.value}
                variant={
                  optimisticEditionType === option.value ? "default" : "outline"
                }
                className={`cursor-pointer ${
                  optimisticEditionType === option.value
                    ? "bg-ms-accent hover:bg-ms-accent/90 text-white"
                    : "border-ms-border text-ms-text-secondary hover:bg-ms-bg-tertiary hover:text-ms-text-primary"
                }`}
                disabled={isEditionPreferencePending}
                aria-pressed={optimisticEditionType === option.value}
                onClick={() => handleEditionPreferenceChange(option.value)}
              >
                <span aria-hidden="true">{option.icon}</span> {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Formats hidden-item timestamps whenever Settings shows audit context for restored filters.
 * @param isoString - ISO timestamp stored with the hidden item.
 * @returns Relative age for recent timestamps or a short absolute date for older items.
 * @example
 * formatRelativeTime("2030-01-15T00:00:00.000Z") // => "2h ago"
 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
