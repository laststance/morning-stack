import type { EditionType } from "@/lib/db/schema";

/**
 * Builds canonical root URLs whenever Header/date controls or server redirects change the requested edition selection.
 * @param date - Historical date to retain, or `null` for today's canonical URL.
 * @param editionType - Explicit edition to preserve, or `null` for the default current briefing.
 * @returns Canonical root href with date before edition when historical.
 * @example
 * buildHomeHref("2030-01-14", "evening") // => "/?date=2030-01-14&edition=evening"
 */
export function buildHomeHref(
  date: string | null,
  editionType: EditionType | null,
): string {
  if (date && editionType) {
    return `/?date=${date}&edition=${editionType}`;
  }

  if (editionType) return `/?edition=${editionType}`;
  return "/";
}
