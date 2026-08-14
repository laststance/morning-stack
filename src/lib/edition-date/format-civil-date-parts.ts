import type { CivilDateParts } from "@/lib/edition-date/civil-date-parts";
import { CIVIL_DATE_FIELD_WIDTH } from "@/lib/edition-date/constants";

const CIVIL_DATE_YEAR_WIDTH = 4;

/**
 * Serializes validated calendar fields for URL navigation and Postgres date lookup without local-time conversion.
 * @param civilDate - Calendar fields produced by strict parsing or UTC arithmetic.
 * @returns Canonical `YYYY-MM-DD` text.
 * @example
 * formatCivilDateParts({ year: 2028, month: 3, day: 1 }) // => "2028-03-01"
 */
export function formatCivilDateParts(civilDate: CivilDateParts): string {
  return [
    civilDate.year.toString().padStart(CIVIL_DATE_YEAR_WIDTH, "0"),
    civilDate.month.toString().padStart(CIVIL_DATE_FIELD_WIDTH, "0"),
    civilDate.day.toString().padStart(CIVIL_DATE_FIELD_WIDTH, "0"),
  ].join("-");
}
