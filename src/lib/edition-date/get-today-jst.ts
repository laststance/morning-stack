import { EDITION_TIME_ZONE } from "@/lib/edition-date/constants";
import { getEditionNow } from "@/lib/edition-date/get-edition-now";

/**
 * Resolves the product's current JST civil date whenever HomePage canonicalizes URL state.
 * @returns Current date formatted as `YYYY-MM-DD` in Asia/Tokyo.
 * @example
 * getTodayJst() // => "2030-01-15"
 */
export function getTodayJst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EDITION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(getEditionNow());
}
