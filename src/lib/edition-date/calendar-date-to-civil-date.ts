import { TZDate } from "react-day-picker";

import {
  EDITION_TIME_ZONE,
  MONTH_INDEX_OFFSET,
} from "@/lib/edition-date/constants";
import { formatCivilDateParts } from "@/lib/edition-date/format-civil-date-parts";

/**
 * Serializes DayPicker's Asia/Tokyo value whenever a calendar day is selected, avoiding ISO/browser-local conversions.
 * @param value - DayPicker value emitted under the archive Calendar's fixed timezone.
 * @returns Canonical `YYYY-MM-DD` URL date.
 * @example
 * calendarDateToCivilDate(selectedDate) // => "2030-01-14"
 */
export function calendarDateToCivilDate(value: Date): string {
  const tokyoDate = new TZDate(value, EDITION_TIME_ZONE);

  return formatCivilDateParts({
    year: tokyoDate.getFullYear(),
    month: tokyoDate.getMonth() + MONTH_INDEX_OFFSET,
    day: tokyoDate.getDate(),
  });
}
