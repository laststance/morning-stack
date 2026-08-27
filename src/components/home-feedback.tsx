"use client";

import { AlertCircle, CalendarX, Info } from "lucide-react";

import { useHomeNavigation } from "@/components/home-navigation-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { EditionType } from "@/lib/db/schema";
import { addDaysToCivilDate } from "@/lib/edition-date/add-days-to-civil-date";
import { formatEditionDate } from "@/lib/edition-date/format-edition-date";

/**
 * Keeps independent bounds/personalization warnings above readable Home content whenever optional account or navigation queries fail.
 * @param props - Independent warning flags supplied by the server route.
 * @returns Compact retryable Alerts, or `null` when both optional systems are available.
 * @example
 * <HomeWarnings isBoundsUnavailable isPersonalizationUnavailable={false} />
 */
export function HomeWarnings({
  isBoundsUnavailable,
  isPersonalizationUnavailable,
}: {
  isBoundsUnavailable: boolean;
  isPersonalizationUnavailable: boolean;
}) {
  const navigation = useHomeNavigation();

  if (!isBoundsUnavailable && !isPersonalizationUnavailable) return null;

  return (
    <div className="flex flex-col gap-3">
      {isBoundsUnavailable && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>Date navigation is temporarily unavailable.</AlertTitle>
          <AlertDescription>
            <p>Articles are still readable.</p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={navigation?.isPending}
              onClick={() => navigation?.retry("retry-dates")}
            >
              {navigation?.isPending &&
              navigation.activeControl === "retry-dates" ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              Retry dates
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isPersonalizationUnavailable && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>Preferences are temporarily unavailable.</AlertTitle>
          <AlertDescription>
            <p>Saved and hidden states may be out of date.</p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={navigation?.isPending}
              onClick={() => navigation?.retry("retry-preferences")}
            >
              {navigation?.isPending &&
              navigation.activeControl === "retry-preferences" ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              Retry preferences
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Renders a truthful exact-edition empty state whenever the published date/type query succeeds without a row.
 * @param props - Requested date/type and shared archive boundary used to choose recovery actions.
 * @returns Missing-edition Empty composition with Previous/Today recovery.
 * @example
 * <MissingEditionState requestedDate="2030-01-14" requestedEditionType="evening" earliestPublishedDate="2030-01-12" />
 */
export function MissingEditionState({
  requestedDate,
  requestedEditionType,
  earliestPublishedDate,
}: {
  requestedDate: string;
  requestedEditionType: EditionType;
  earliestPublishedDate: string | null;
}) {
  const navigation = useHomeNavigation();
  const editionLabel =
    requestedEditionType === "morning" ? "Morning" : "Evening";
  const isAtLowerBound =
    !earliestPublishedDate || requestedDate === earliestPublishedDate;
  const previousDate = addDaysToCivilDate(requestedDate, -1);

  return (
    <Empty className="min-h-[52vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarX aria-hidden="true" />
        </EmptyMedia>
        <h1 className="text-lg font-medium tracking-tight">
          No {editionLabel} edition for {formatEditionDate(requestedDate)}
        </h1>
        <EmptyDescription>
          MorningStack didn&apos;t publish this edition. Choose another date or
          return to today&apos;s briefing.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        {!isAtLowerBound && (
          <Button
            type="button"
            size="lg"
            disabled={navigation?.isPending}
            onClick={() =>
              navigation?.navigate({ control: "previous", date: previousDate })
            }
          >
            {navigation?.isPending &&
            navigation.activeControl === "previous" ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            Previous day
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          variant={isAtLowerBound ? "default" : "outline"}
          disabled={navigation?.isPending}
          onClick={() => navigation?.navigate({ control: "today", date: null })}
        >
          {navigation?.isPending && navigation.activeControl === "today" ? (
            <Spinner data-icon="inline-start" />
          ) : null}
          Today
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/**
 * Renders retry recovery whenever required edition/article/widget queries fail without changing the selected date.
 * @returns Data-unavailable Empty composition with Retry and Today actions.
 * @example
 * <UnavailableEditionState />
 */
export function UnavailableEditionState() {
  const navigation = useHomeNavigation();

  return (
    <Empty className="min-h-[52vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircle aria-hidden="true" />
        </EmptyMedia>
        <h1 className="text-lg font-medium tracking-tight">
          This edition couldn&apos;t be loaded.
        </h1>
        <EmptyDescription>Your selected date is unchanged.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button
          type="button"
          size="lg"
          disabled={navigation?.isPending}
          onClick={() => navigation?.retry("retry-content")}
        >
          {navigation?.isPending &&
          navigation.activeControl === "retry-content" ? (
            <Spinner data-icon="inline-start" />
          ) : null}
          Retry
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={navigation?.isPending}
          onClick={() => navigation?.navigate({ control: "today", date: null })}
        >
          {navigation?.isPending && navigation.activeControl === "today" ? (
            <Spinner data-icon="inline-start" />
          ) : null}
          Today
        </Button>
      </EmptyContent>
    </Empty>
  );
}
