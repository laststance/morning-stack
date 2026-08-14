"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { EditionType } from "@/lib/db/schema";
import { buildHomeHref } from "@/lib/edition-navigation/build-home-href";

/** Controls that can own the single pending indicator during Home navigation. */
export type HomeNavigationControl =
  | "morning"
  | "evening"
  | "previous"
  | "date"
  | "next"
  | "today"
  | "retry-content"
  | "retry-dates"
  | "retry-preferences";

/** One-field URL patch requested by Header or EditionDateNavigator. */
interface HomeNavigationRequest {
  control: HomeNavigationControl;
  date?: string | null;
  editionType?: EditionType;
}

/** Shared navigation API that keeps cross-control actions locked until the App Router commits server props. */
interface HomeNavigationContextValue {
  activeControl: HomeNavigationControl | null;
  isPending: boolean;
  navigate: (request: HomeNavigationRequest) => void;
  retry: (control: HomeNavigationControl) => void;
}

const HomeNavigationContext = createContext<HomeNavigationContextValue | null>(
  null,
);

/**
 * Provides one URL-authoritative App Router transition to Home Header/date controls whenever the home route renders.
 * @param props - Confirmed request metadata plus the Header/Date Rail subtree.
 * @returns Context provider enforcing one pending lock and activated-control indicator.
 * @example
 * <HomeNavigationProvider requestedDate="2030-01-14" requestedEditionType="morning">...</HomeNavigationProvider>
 */
export function HomeNavigationProvider({
  children,
  requestedDate,
  requestedEditionType,
}: {
  children: ReactNode;
  requestedDate: string;
  requestedEditionType: EditionType;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeControl, setActiveControl] =
    useState<HomeNavigationControl | null>(null);
  const [pendingAnnouncement, setPendingAnnouncement] = useState("");
  const isNavigationLocked = useRef(false);

  // Release the synchronous lock only after React commits the server-confirmed navigation result.
  useEffect(() => {
    if (!isPending) isNavigationLocked.current = false;
  }, [isPending]);

  const navigate = useCallback(
    (request: HomeNavigationRequest) => {
      if (isNavigationLocked.current) return;
      isNavigationLocked.current = true;

      const browserUrl = new URL(window.location.href);
      const browserDate = browserUrl.searchParams.get("date");
      const browserEdition = browserUrl.searchParams.get("edition");
      const currentEditionType: EditionType =
        browserEdition === "morning" || browserEdition === "evening"
          ? browserEdition
          : requestedEditionType;
      const targetDate =
        request.date === undefined ? browserDate : request.date;
      const targetEditionType = request.editionType ?? currentEditionType;
      const targetHref = buildHomeHref(targetDate, targetEditionType);
      const targetDateLabel = targetDate ?? "today";

      startTransition(() => {
        setActiveControl(request.control);
        setPendingAnnouncement(
          `Loading ${targetDateLabel} ${targetEditionType} edition`,
        );
        router.push(targetHref);
      });
    },
    [requestedEditionType, router],
  );

  const retry = useCallback(
    (control: HomeNavigationControl) => {
      if (isNavigationLocked.current) return;
      isNavigationLocked.current = true;

      startTransition(() => {
        setActiveControl(control);
        setPendingAnnouncement(
          `Retrying ${requestedDate} ${requestedEditionType} edition`,
        );
        router.refresh();
      });
    },
    [requestedDate, requestedEditionType, router],
  );

  return (
    <HomeNavigationContext
      value={{
        activeControl: isPending ? activeControl : null,
        isPending,
        navigate,
        retry,
      }}
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isPending
          ? pendingAnnouncement
          : `Showing ${requestedDate} ${requestedEditionType} edition`}
      </span>
      {children}
    </HomeNavigationContext>
  );
}

/**
 * Reads the shared home transition when Header or Date Rail handles navigation inside the provider.
 * @returns Home navigation API, or `null` for the standard Header on non-home site routes.
 * @example
 * const navigation = useHomeNavigation()
 */
export function useHomeNavigation(): HomeNavigationContextValue | null {
  return use(HomeNavigationContext);
}
