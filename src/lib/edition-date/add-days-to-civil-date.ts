import { MONTH_INDEX_OFFSET } from "@/lib/edition-date/constants";
import { formatCivilDateParts } from "@/lib/edition-date/format-civil-date-parts";
import { parseCivilDate } from "@/lib/edition-date/parse-civil-date";

/**
 * Shifts Previous/Next targets with UTC calendar arithmetic so browser timezone and daylight-saving changes cannot drift dates.
 * @param value - Valid canonical edition date.
 * @param dayOffset - Whole calendar days to move, normally `-1` or `1`.
 * @returns Shifted canonical edition date.
 * @example
 * addDaysToCivilDate("2028-02-29", 1) // => "2028-03-01"
 */
export function addDaysToCivilDate(value: string, dayOffset: number): string {
  const civilDate = parseCivilDate(value);

  // Invalid internal dates indicate a programming error, not a recoverable navigation state.
  if (!civilDate) {
    throw new RangeError(`Invalid civil date: ${value}`);
  }

  const shiftedDate = new Date(
    Date.UTC(
      civilDate.year,
      civilDate.month - MONTH_INDEX_OFFSET,
      civilDate.day + dayOffset,
    ),
  );

  return formatCivilDateParts({
    year: shiftedDate.getUTCFullYear(),
    month: shiftedDate.getUTCMonth() + MONTH_INDEX_OFFSET,
    day: shiftedDate.getUTCDate(),
  });
}
