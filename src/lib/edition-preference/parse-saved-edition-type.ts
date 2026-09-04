import type { EditionType } from "@/lib/db/schema";

/**
 * Validates the browser-stored default before Home or Settings trusts the cookie value.
 * @param value - Raw cookie value, or `undefined` when no preference has been saved.
 * @returns A valid MorningStack edition type, otherwise `null`.
 * @example
 * parseSavedEditionType("evening") // => "evening"
 * parseSavedEditionType("weekly") // => null
 */
export function parseSavedEditionType(
  value: string | undefined,
): EditionType | null {
  if (value === "morning" || value === "evening") return value;
  return null;
}
