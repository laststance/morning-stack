import { TZDate } from "react-day-picker";

import {
  EDITION_TIME_ZONE,
  MONTH_INDEX_OFFSET,
} from "@/lib/edition-date/constants";
import { parseCivilDate } from "@/lib/edition-date/parse-civil-date";

/**
 * Converts a selected civil date into DayPicker's timezone-aware value when EditionDateNavigator opens the Calendar.
 * @param value - Valid canonical edition date.
 * @returns Asia/Tokyo `TZDate` representing that calendar day.
 * @example
 * civilDateToCalendarDate("2030-01-15") // => TZDate in Asia/Tokyo
 */
export function civilDateToCalendarDate(value: string): TZDate {
  const civilDate = parseCivilDate(value);
  if (!civilDate) throw new RangeError(`Invalid civil date: ${value}`);

  return new TZDate(
    civilDate.year,
    civilDate.month - MONTH_INDEX_OFFSET,
    civilDate.day,
    EDITION_TIME_ZONE,
  );
}
