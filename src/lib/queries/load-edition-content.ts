import type { EditionType } from "@/lib/db/schema";
import type { ResolvedHomeSelection } from "@/lib/edition-navigation/resolved-home-selection";
import type { EditionData } from "@/lib/queries/edition";
import type { WidgetData } from "@/lib/widget-snapshots";

/** Query dependencies injected at the route seam so loader behavior is testable without mocking internal modules. */
export interface EditionContentDependencies {
  getEdition: (
    editionType: EditionType,
    date: string,
  ) => Promise<EditionData | null>;
  getLatestEdition: () => Promise<EditionData | null>;
  getWidgetData: () => Promise<WidgetData>;
}

/** Exact or permitted latest-fallback content with route-request metadata kept separate from rendered metadata. */
export interface FoundEditionContent {
  status: "found";
  requestedDate: string;
  requestedEditionType: EditionType;
  edition: EditionData;
  widgets: WidgetData | null;
  isLatestFallback: boolean;
}

/** Truthful absence after a successful exact query. */
export interface MissingEditionContent {
  status: "missing";
  requestedDate: string;
  requestedEditionType: EditionType;
}

/** Retryable required-query failure that must never masquerade as missing content. */
export interface UnavailableEditionContent {
  status: "unavailable";
  requestedDate: string;
  requestedEditionType: EditionType;
}

/** Server content state rendered by the home route. */
export type EditionContentResult =
  | FoundEditionContent
  | MissingEditionContent
  | UnavailableEditionContent;

/**
 * Loads exact/current content for HomePage while skipping widgets in historical mode and limiting fallback to the implicit current briefing.
 * @param selection - Canonical server-confirmed URL selection.
 * @param dependencies - Edition/widget query boundary used by the route and logic tests.
 * @returns `found`, `missing`, or retryable `unavailable` content state.
 * @example
 * await loadEditionContent(selection, { getEdition, getLatestEdition, getWidgetData })
 */
export async function loadEditionContent(
  selection: ResolvedHomeSelection,
  dependencies: EditionContentDependencies,
): Promise<EditionContentResult> {
  try {
    // Historical pages never read current-only widget caches.
    if (selection.isHistoricalSelection) {
      const edition = await dependencies.getEdition(
        selection.requestedEditionType,
        selection.requestedDate,
      );

      if (!edition) return getMissingResult(selection);

      return {
        status: "found",
        requestedDate: selection.requestedDate,
        requestedEditionType: selection.requestedEditionType,
        edition,
        widgets: null,
        isLatestFallback: false,
      };
    }

    const requestedEdition = await dependencies.getEdition(
      selection.requestedEditionType,
      selection.requestedDate,
    );
    const edition =
      requestedEdition ??
      (selection.allowLatestFallback
        ? await dependencies.getLatestEdition()
        : null);

    if (!edition) return getMissingResult(selection);

    const widgets = await dependencies.getWidgetData().catch(() => {
      console.error("[HomePage] Optional widget data unavailable");
      return null;
    });

    return {
      status: "found",
      requestedDate: selection.requestedDate,
      requestedEditionType: selection.requestedEditionType,
      edition,
      widgets,
      isLatestFallback: edition.id !== requestedEdition?.id,
    };
  } catch {
    console.error("[HomePage] Required edition data unavailable");
    return {
      status: "unavailable",
      requestedDate: selection.requestedDate,
      requestedEditionType: selection.requestedEditionType,
    };
  }
}

/**
 * Produces the shared exact-miss result used by current and historical query branches.
 * @param selection - Canonical server request state.
 * @returns Date/type-specific missing result.
 * @example
 * getMissingResult(selection) // => { status: "missing", requestedDate, requestedEditionType }
 */
function getMissingResult(
  selection: ResolvedHomeSelection,
): MissingEditionContent {
  return {
    status: "missing",
    requestedDate: selection.requestedDate,
    requestedEditionType: selection.requestedEditionType,
  };
}
