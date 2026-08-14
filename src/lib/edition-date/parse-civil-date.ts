import type { CivilDateParts } from "@/lib/edition-date/civil-date-parts";
import {
  CIVIL_DATE_PATTERN,
  MONTH_INDEX_OFFSET,
} from "@/lib/edition-date/constants";

/**
 * Strictly parses URL/DB edition dates so the home resolver rejects malformed or impossible calendar values.
 * @param value - Candidate `YYYY-MM-DD` string from a URL or database row.
 * @returns Parsed calendar fields for a real date, otherwise `null`.
 * @example
 * parseCivilDate("2028-02-29") // => { year: 2028, month: 2, day: 29 }
 */
export function parseCivilDate(value: string): CivilDateParts | null {
  const match = CIVIL_DATE_PATTERN.exec(value);

  // Reject non-canonical syntax before attempting calendar validation.
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const roundTripDate = new Date(0);
  roundTripDate.setUTCHours(0, 0, 0, 0);
  // setUTCFullYear preserves canonical years 0000-0099 instead of Date.UTC remapping them to 1900-1999.
  roundTripDate.setUTCFullYear(year, month - MONTH_INDEX_OFFSET, day);

  // UTC round-tripping rejects dates that JavaScript would silently roll forward.
  if (
    roundTripDate.getUTCFullYear() !== year ||
    roundTripDate.getUTCMonth() + MONTH_INDEX_OFFSET !== month ||
    roundTripDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}
