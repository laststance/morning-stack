import type { EditionType } from "@/lib/db/schema";
import {
  EDITION_TIME_ZONE,
  EVENING_START_HOUR,
} from "@/lib/edition-date/constants";
import { getEditionNow } from "@/lib/edition-date/get-edition-now";

/**
 * Selects Morning before noon JST and Evening afterward whenever `/` has no explicit edition query.
 * @returns Time-based default edition type in the product timezone.
 * @example
 * getDefaultEditionType() // => "morning" or "evening"
 */
export function getDefaultEditionType(): EditionType {
  const tokyoHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: EDITION_TIME_ZONE,
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
    }).format(getEditionNow()),
  );

  return tokyoHour < EVENING_START_HOUR ? "morning" : "evening";
}
