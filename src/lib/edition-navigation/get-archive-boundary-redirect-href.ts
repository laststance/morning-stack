import { buildHomeHref } from "@/lib/edition-navigation/build-home-href";
import type { ResolvedHomeSelection } from "@/lib/edition-navigation/resolved-home-selection";

/**
 * Canonicalizes requests before the shared archive start after bounds load, preserving the requested edition even when absent there.
 * @param selection - Syntax-normalized server request state.
 * @param earliestPublishedDate - Minimum date containing any published edition.
 * @returns Boundary redirect href, or `null` when the request is already in range.
 * @example
 * getArchiveBoundaryRedirectHref(selection, "2030-01-12") // => "/?date=2030-01-12&edition=evening"
 */
export function getArchiveBoundaryRedirectHref(
  selection: ResolvedHomeSelection,
  earliestPublishedDate: string,
): string | null {
  if (
    !selection.isHistoricalSelection ||
    selection.requestedDate >= earliestPublishedDate
  ) {
    return null;
  }

  return buildHomeHref(earliestPublishedDate, selection.requestedEditionType);
}
