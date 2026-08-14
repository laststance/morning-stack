import { EDITION_TIME_ZONE } from "@/lib/edition-date/constants";
import { civilDateToCalendarDate } from "@/lib/edition-date/civil-date-to-calendar-date";

/**
 * Formats server-confirmed requested/rendered dates for the Header, Date Rail, notices, and recovery copy.
 * @param value - Valid canonical edition date.
 * @returns English `MMM d, yyyy` label in Asia/Tokyo.
 * @example
 * formatEditionDate("2030-01-15") // => "Jan 15, 2030"
 */
export function formatEditionDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EDITION_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(civilDateToCalendarDate(value));
}
