"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import {
  DATE_PICKER_COLLISION_PADDING_PX,
  DATE_PICKER_TRIGGER_OFFSET_PX,
} from "@/components/edition-date/constants";
import { useHomeNavigation } from "@/components/home-navigation-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import type { EditionType } from "@/lib/db/schema";
import { addDaysToCivilDate } from "@/lib/edition-date/add-days-to-civil-date";
import { calendarDateToCivilDate } from "@/lib/edition-date/calendar-date-to-civil-date";
import { civilDateToCalendarDate } from "@/lib/edition-date/civil-date-to-calendar-date";
import { EDITION_TIME_ZONE } from "@/lib/edition-date/constants";
import { formatEditionDate } from "@/lib/edition-date/format-edition-date";

/**
 * Renders Previous/date-picker/Next controls below Home Header whenever bounds and requested-date props are server-confirmed.
 * @param props - Requested date, today's JST date, and independent archive-bound result.
 * @returns Accessible centered Date Rail with current/historical context and native disabled boundaries.
 * @example
 * <EditionDateNavigator requestedDate="2030-01-14" requestedEditionType="morning" today="2030-01-15" earliestPublishedDate="2030-01-12" />
 */
export function EditionDateNavigator({
  requestedDate,
  requestedEditionType,
  today,
  earliestPublishedDate,
}: {
  requestedDate: string;
  requestedEditionType: EditionType;
  today: string;
  earliestPublishedDate: string | null;
}) {
  const navigation = useHomeNavigation();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const isBoundsAvailable = earliestPublishedDate !== null;
  const previousDate = addDaysToCivilDate(requestedDate, -1);
  const nextDate = addDaysToCivilDate(requestedDate, 1);
  const isPreviousDisabled =
    !navigation ||
    navigation.isPending ||
    !earliestPublishedDate ||
    requestedDate <= earliestPublishedDate;
  const isNextDisabled =
    !navigation || navigation.isPending || requestedDate >= today;
  const isDatePickerDisabled =
    !navigation || navigation.isPending || !isBoundsAvailable;

  /**
   * Navigates after DayPicker commits an enabled date, then closes Popover so focus returns to its trigger.
   * @param selectedDate - Calendar value emitted by React DayPicker.
   * @returns Nothing; invalid selections are ignored and valid selections start shared navigation.
   * @example
   * handleDateSelect(new Date("2030-01-14T12:00:00+09:00"))
   */
  const handleDateSelect = (selectedDate: Date | undefined): void => {
    if (!selectedDate || !navigation) return;

    const selectedCivilDate = calendarDateToCivilDate(selectedDate);
    setIsCalendarOpen(false);
    navigation.navigate({
      control: "date",
      date: selectedCivilDate === today ? null : selectedCivilDate,
    });
  };

  return (
    <nav
      aria-label="Edition date"
      aria-busy={navigation?.isPending}
      className="border-ms-border/60 border-b px-4 py-3 sm:px-6"
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={isPreviousDisabled}
          aria-label={`Previous day, ${formatEditionDate(previousDate)}`}
          onClick={() =>
            navigation?.navigate({ control: "previous", date: previousDate })
          }
        >
          {navigation?.isPending && navigation.activeControl === "previous" ? (
            <Spinner aria-label="Loading previous day" />
          ) : (
            <ChevronLeft aria-hidden="true" />
          )}
        </Button>

        <Popover
          modal
          open={isCalendarOpen}
          onOpenChange={setIsCalendarOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isDatePickerDisabled}
              className="data-[state=open]:border-ms-accent h-auto min-h-11 min-w-0 justify-center px-2 py-1.5"
              aria-label={`Choose edition date for ${requestedEditionType}, currently ${formatEditionDate(requestedDate)}`}
            >
              {navigation?.isPending && navigation.activeControl === "date" ? (
                <Spinner
                  data-icon="inline-start"
                  aria-label="Loading selected date"
                />
              ) : (
                <CalendarDays data-icon="inline-start" aria-hidden="true" />
              )}
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="truncate font-medium">
                  {formatEditionDate(requestedDate)}
                </span>
                <span className="text-ms-text-muted text-xs font-normal">
                  {requestedDate === today ? "Today" : "Historical edition"}
                </span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            sideOffset={DATE_PICKER_TRIGGER_OFFSET_PX}
            collisionPadding={DATE_PICKER_COLLISION_PADDING_PX}
            className="w-[min(20rem,calc(100vw-2rem))] p-0"
          >
            <Calendar
              mode="single"
              timeZone={EDITION_TIME_ZONE}
              selected={civilDateToCalendarDate(requestedDate)}
              defaultMonth={civilDateToCalendarDate(requestedDate)}
              onSelect={handleDateSelect}
              disabled={
                earliestPublishedDate
                  ? [
                      {
                        before: civilDateToCalendarDate(earliestPublishedDate),
                      },
                      { after: civilDateToCalendarDate(today) },
                    ]
                  : true
              }
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={isNextDisabled}
          aria-label={`Next day, ${formatEditionDate(nextDate)}`}
          onClick={() =>
            navigation?.navigate({ control: "next", date: nextDate })
          }
        >
          {navigation?.isPending && navigation.activeControl === "next" ? (
            <Spinner aria-label="Loading next day" />
          ) : (
            <ChevronRight aria-hidden="true" />
          )}
        </Button>
      </div>
    </nav>
  );
}
