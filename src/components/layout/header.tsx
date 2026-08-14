"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LogIn } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import type { EditionType } from "@/lib/db/schema";
import { toggleSidebar, setSidebarOpen } from "@/lib/features/ui-slice";
import { formatEditionDate } from "@/lib/edition-date/format-edition-date";
import { buildHomeHref } from "@/lib/edition-navigation/build-home-href";
import { useHomeNavigation } from "@/components/home-navigation-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** No-op subscribe for useSyncExternalStore — value never changes */
const emptySubscribe = () => () => {};

/**
 * Renders global app controls and server-confirmed Home edition tabs, using the shared transition when the home route supplies selection props.
 * @param props - Optional Home request state; site routes use their standard non-home Header behavior.
 * @returns Responsive Header with edition, account, theme, bookmark, and settings controls.
 * @example
 * <Header requestedDate="2030-01-14" requestedEditionType="morning" isHistoricalSelection />
 */
export function Header({
  requestedDate,
  requestedEditionType,
  isHistoricalSelection = false,
}: {
  requestedDate?: string;
  requestedEditionType?: EditionType;
  isHistoricalSelection?: boolean;
} = {}) {
  const router = useRouter();
  const homeNavigation = useHomeNavigation();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const dispatch = useAppDispatch();
  const storedEditionType = useAppSelector((state) => state.edition.type);
  const storedEditionDate = useAppSelector((state) => state.edition.date);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const editionType = requestedEditionType ?? storedEditionType;
  const editionDate = requestedDate ?? storedEditionDate;

  const tabs: { type: EditionType; label: string; icon: string }[] = [
    { type: "morning", label: "Morning", icon: "☀️" },
    { type: "evening", label: "Evening", icon: "🌙" },
  ];

  const handleEditionSelect = useCallback(
    (selectedEditionType: EditionType) => {
      if (homeNavigation) {
        homeNavigation.navigate({
          control: selectedEditionType,
          editionType: selectedEditionType,
        });
        return;
      }

      router.push(buildHomeHref(null, selectedEditionType));
    },
    [homeNavigation, router],
  );

  return (
    <header className="glass-elevated sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <Link
          href="/"
          className="text-ms-text-primary shrink-0 text-lg font-bold"
        >
          MorningStack
        </Link>

        {/* Center: Edition tabs + date (hidden on mobile) */}
        <div className="hidden flex-col items-center gap-0.5 sm:flex">
          <div
            className="flex gap-1"
            role="tablist"
            aria-label="Edition selector"
          >
            {tabs.map((tab) => (
              <button
                key={tab.type}
                role="tab"
                aria-selected={editionType === tab.type}
                disabled={homeNavigation?.isPending}
                className={`relative cursor-pointer px-3 pt-1 pb-1.5 text-xs font-medium uppercase transition-colors ${
                  editionType === tab.type
                    ? "text-ms-accent"
                    : "text-ms-text-muted hover:text-ms-text-secondary"
                }`}
                onClick={() => handleEditionSelect(tab.type)}
              >
                {homeNavigation?.isPending &&
                homeNavigation.activeControl === tab.type ? (
                  <Spinner aria-label={`Loading ${tab.label} edition`} />
                ) : (
                  <span aria-hidden="true">{tab.icon}</span>
                )}{" "}
                {tab.label}
                {/* Active tab underline */}
                {editionType === tab.type && (
                  <span className="bg-ms-accent absolute inset-x-3 bottom-0 h-0.5 rounded-full" />
                )}
              </button>
            ))}
          </div>
          {!isHistoricalSelection && (
            <span className="text-ms-text-muted text-xs leading-none">
              {formatEditionDate(editionDate)} -{" "}
              {editionType === "morning"
                ? "Morning Edition"
                : "Evening Edition"}
            </span>
          )}
        </div>

        {/* Right: Icons + Auth (hidden on mobile) */}
        <div className="hidden items-center gap-1 sm:flex">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="text-ms-text-muted hover:text-ms-text-primary cursor-pointer"
            aria-label="Bookmarks"
          >
            <Link href="/bookmarks">
              <BookmarkIcon />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="text-ms-text-muted hover:text-ms-text-primary cursor-pointer"
            aria-label="Settings"
          >
            <Link href="/settings">
              <SettingsIcon />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="text-ms-text-muted hover:text-ms-text-primary cursor-pointer"
            aria-label={
              mounted && resolvedTheme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
            }
            onClick={() =>
              setNextTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {mounted ? (
              resolvedTheme === "dark" ? (
                <SunIcon />
              ) : (
                <MoonIcon />
              )
            ) : (
              <span className="size-5" />
            )}
          </Button>

          {session?.user ? (
            <div className="flex items-center gap-2 pl-2">
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "User avatar"}
                  className="size-7 rounded-full"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-ms-text-muted hover:text-ms-text-primary cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-ms-border text-ms-text-primary hover:bg-ms-bg-tertiary ml-2 cursor-pointer"
            >
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>

        {/* Mobile: Hamburger button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-ms-text-muted hover:text-ms-text-primary cursor-pointer sm:hidden"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
          onClick={() => dispatch(toggleSidebar())}
        >
          {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
        </Button>
      </div>

      {/* Mobile menu dropdown */}
      {sidebarOpen && (
        <nav
          className="border-ms-glass-border bg-ms-bg-primary border-t px-4 pb-4 sm:hidden"
          aria-label="Mobile navigation"
        >
          {/* Edition tabs */}
          <div
            className="border-ms-border flex gap-1 border-b py-3"
            role="tablist"
            aria-label="Edition selector"
          >
            {tabs.map((tab) => (
              <button
                key={tab.type}
                role="tab"
                aria-selected={editionType === tab.type}
                disabled={homeNavigation?.isPending}
                className={`relative min-h-11 cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  editionType === tab.type
                    ? "bg-ms-accent/10 text-ms-accent"
                    : "text-ms-text-muted hover:text-ms-text-secondary"
                }`}
                onClick={() => {
                  handleEditionSelect(tab.type);
                  dispatch(setSidebarOpen(false));
                }}
              >
                {homeNavigation?.isPending &&
                homeNavigation.activeControl === tab.type ? (
                  <Spinner aria-label={`Loading ${tab.label} edition`} />
                ) : (
                  <span aria-hidden="true">{tab.icon}</span>
                )}{" "}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Edition date */}
          {!isHistoricalSelection && (
            <p className="text-ms-text-muted py-2 text-xs">
              {formatEditionDate(editionDate)} -{" "}
              {editionType === "morning"
                ? "Morning Edition"
                : "Evening Edition"}
            </p>
          )}

          {/* Navigation links — 44px min-height for touch targets */}
          <div className="flex flex-col gap-1">
            <Link
              href="/bookmarks"
              className="text-ms-text-secondary hover:bg-ms-bg-tertiary hover:text-ms-text-primary flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm"
              onClick={() => dispatch(setSidebarOpen(false))}
            >
              <BookmarkIcon /> Bookmarks
            </Link>
            <Link
              href="/settings"
              className="text-ms-text-secondary hover:bg-ms-bg-tertiary hover:text-ms-text-primary flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm"
              onClick={() => dispatch(setSidebarOpen(false))}
            >
              <SettingsIcon /> Settings
            </Link>
            <button
              className="text-ms-text-secondary hover:bg-ms-bg-tertiary hover:text-ms-text-primary flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm"
              onClick={() =>
                setNextTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {mounted && resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}{" "}
              {mounted && resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </button>

            {session?.user ? (
              <button
                className="text-ms-text-secondary hover:bg-ms-bg-tertiary hover:text-ms-text-primary flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm"
                onClick={() => {
                  dispatch(setSidebarOpen(false));
                  signOut({ callbackUrl: "/" });
                }}
              >
                {session.user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt=""
                    className="size-5 rounded-full"
                  />
                )}
                Sign out ({session.user.name ?? "User"})
              </button>
            ) : (
              <Link
                href="/login"
                className="bg-ms-accent hover:bg-ms-accent/90 flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors"
                onClick={() => dispatch(setSidebarOpen(false))}
              >
                <LogIn className="size-4" aria-hidden="true" />
                Login
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

/** Bookmark (star outline) icon — 20×20 */
function BookmarkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="size-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3a1 1 0 0 0-1 1v12.5l6-3.5 6 3.5V4a1 1 0 0 0-1-1H5Z"
      />
    </svg>
  );
}

/** Settings (gear) icon — 20×20 */
function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="size-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.5 2.5h3l.4 1.8a5.5 5.5 0 0 1 1.3.7l1.8-.5 1.5 2.6-1.3 1.3a5.5 5.5 0 0 1 0 1.4l1.3 1.3-1.5 2.6-1.8-.5a5.5 5.5 0 0 1-1.3.7l-.4 1.8h-3l-.4-1.8a5.5 5.5 0 0 1-1.3-.7l-1.8.5-1.5-2.6 1.3-1.3a5.5 5.5 0 0 1 0-1.4L3.5 7.1 5 4.5l1.8.5a5.5 5.5 0 0 1 1.3-.7l.4-1.8Z"
      />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

/** Hamburger menu icon — 20×20 */
function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="size-5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

/** Close (X) icon — 20×20 */
function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="size-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5l10 10M15 5L5 15"
      />
    </svg>
  );
}

/** Sun icon — for switching to light theme — 20×20 */
function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="size-5"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="3.5" />
      <path
        strokeLinecap="round"
        d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"
      />
    </svg>
  );
}

/** Moon icon — for switching to dark theme — 20×20 */
function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="size-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5a6.5 6.5 0 1 1-8-6.3A5 5 0 0 0 16.5 10.5Z"
      />
    </svg>
  );
}
