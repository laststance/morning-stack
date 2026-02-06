"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setEditionType, type EditionType } from "@/lib/features/edition-slice";
import { unhideItem, type HiddenItem } from "@/app/actions/hidden";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
}

/**
 * Client component for the settings page.
 *
 * Uses shadcn/ui Tabs for section navigation between Account, Hidden Items,
 * and Display Preferences. Receives server-fetched data via props.
 */
export function SettingsContent({ user, hiddenItems }: SettingsContentProps) {
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
        <DisplayPreferencesSection />
      </TabsContent>
    </Tabs>
  );
}

// ─── Account Section ────────────────────────────────────────────────

/**
 * Displays user info (avatar, name, email) and a sign-out button.
 */
function AccountSection({
  user,
}: {
  user: SettingsContentProps["user"];
}) {
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
            <div className="flex size-16 items-center justify-center rounded-full bg-ms-bg-tertiary text-xl font-bold text-ms-text-muted">
              {user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-medium text-ms-text-primary">
              {user.name ?? "Unknown"}
            </p>
            <p className="truncate text-sm text-ms-text-secondary">
              {user.email ?? "No email"}
            </p>
          </div>
        </div>

        <div className="border-t border-ms-border pt-4">
          <Button
            variant="outline"
            className="cursor-pointer border-ms-border text-ms-text-primary hover:bg-ms-bg-tertiary"
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
 * Lists all hidden items grouped by type, with "Unhide" button for each.
 * Optimistic removal — item disappears immediately while the server action runs.
 */
function HiddenItemsSection({
  initialItems,
}: {
  initialItems: HiddenItem[];
}) {
  const router = useRouter();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const visibleItems = initialItems.filter((item) => !removedIds.has(item.id));

  /** Unhide an item optimistically — remove from UI, persist to server. */
  async function handleUnhide(item: HiddenItem) {
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
              <p className="text-sm text-ms-text-muted">
                No hidden items. Articles, sources, or topics you hide will appear here.
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
          <span className="ml-2 text-sm font-normal text-ms-text-muted">
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
              <h3 className="mb-2 text-sm font-medium text-ms-text-secondary">
                {TARGET_TYPE_ICONS[type]} {TARGET_TYPE_LABELS[type]}s ({items.length})
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-ms-border bg-ms-bg-tertiary px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ms-text-primary">
                        {item.targetId}
                      </p>
                      <p className="text-xs text-ms-text-muted">
                        Hidden {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 shrink-0 cursor-pointer border-ms-border text-ms-text-secondary hover:bg-ms-bg-primary hover:text-ms-text-primary"
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
 * Theme toggle (dark/light) and default edition (morning/evening) selector.
 * Theme uses `next-themes`; edition preference uses Redux.
 */
function DisplayPreferencesSection() {
  const { theme, setTheme: setNextTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const dispatch = useAppDispatch();
  const editionType = useAppSelector((s) => s.edition.type);

  const themeOptions: { value: string; label: string; icon: string }[] = [
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "light", label: "Light", icon: "☀️" },
    { value: "system", label: "System", icon: "💻" },
  ];

  const editionOptions: { value: EditionType; label: string; icon: string }[] = [
    { value: "morning", label: "Morning", icon: "☀️" },
    { value: "evening", label: "Evening", icon: "🌙" },
  ];

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
                      ? "bg-ms-accent text-white hover:bg-ms-accent/90"
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
          <CardTitle className="text-ms-text-primary">Default Edition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-ms-text-muted">
            Choose which edition loads by default when you open MorningStack.
          </p>
          <div className="flex gap-2">
            {editionOptions.map((option) => (
              <Button
                key={option.value}
                variant={editionType === option.value ? "default" : "outline"}
                className={`cursor-pointer ${
                  editionType === option.value
                    ? "bg-ms-accent text-white hover:bg-ms-accent/90"
                    : "border-ms-border text-ms-text-secondary hover:bg-ms-bg-tertiary hover:text-ms-text-primary"
                }`}
                onClick={() => dispatch(setEditionType(option.value))}
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
 * Format an ISO timestamp into a human-readable relative time string.
 * e.g. "2 hours ago", "3 days ago"
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
