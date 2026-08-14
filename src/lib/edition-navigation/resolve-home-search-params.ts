import type { EditionType } from "@/lib/db/schema";
import { parseCivilDate } from "@/lib/edition-date/parse-civil-date";
import { buildHomeHref } from "@/lib/edition-navigation/build-home-href";
import type {
  HomeSearchParams,
  ResolvedHomeSelection,
} from "@/lib/edition-navigation/resolved-home-selection";

/**
 * Resolves initial home URL syntax before DB work so invalid/future/today/duplicate values redirect without being swallowed by query errors.
 * @param searchParams - Raw App Router `date` and `edition` values.
 * @param today - Current JST civil date supplied by the server clock.
 * @param defaultEditionType - Time-based edition used only when no valid edition is explicit.
 * @returns Requested navigation state plus a canonical redirect href when normalization is required.
 * @example
 * resolveHomeSearchParams({ date: "2030-01-14" }, "2030-01-15", "morning")
 */
export function resolveHomeSearchParams(
  searchParams: HomeSearchParams,
  today: string,
  defaultEditionType: EditionType,
): ResolvedHomeSelection {
  const dateCandidates = Array.isArray(searchParams.date)
    ? searchParams.date
    : searchParams.date
      ? [searchParams.date]
      : [];
  const editionCandidates = Array.isArray(searchParams.edition)
    ? searchParams.edition
    : searchParams.edition
      ? [searchParams.edition]
      : [];
  const validDate = dateCandidates.find(
    (candidate) => parseCivilDate(candidate) !== null,
  );
  const validEditionType = editionCandidates.find(
    (candidate) => candidate === "morning" || candidate === "evening",
  );
  const requestedEditionType: EditionType =
    validEditionType === "morning" || validEditionType === "evening"
      ? validEditionType
      : defaultEditionType;
  const requestedDate = validDate && validDate < today ? validDate : today;
  const isHistoricalSelection = requestedDate < today;
  const hasDateParameter = dateCandidates.length > 0;
  const hasEditionParameter = editionCandidates.length > 0;
  const hasCanonicalDate =
    isHistoricalSelection &&
    typeof searchParams.date === "string" &&
    searchParams.date === requestedDate;
  const hasCanonicalEdition =
    typeof searchParams.edition === "string" &&
    searchParams.edition === requestedEditionType;
  const isCanonicalCurrentUrl =
    !hasDateParameter &&
    (!hasEditionParameter || hasCanonicalEdition) &&
    (!hasEditionParameter || Boolean(validEditionType));
  const isCanonicalHistoricalUrl = hasCanonicalDate && hasCanonicalEdition;
  const canonicalHref = isHistoricalSelection
    ? buildHomeHref(requestedDate, requestedEditionType)
    : buildHomeHref(null, validEditionType ? requestedEditionType : null);

  return {
    requestedDate,
    requestedEditionType,
    isHistoricalSelection,
    allowLatestFallback: !hasDateParameter && !hasEditionParameter,
    redirectHref:
      isCanonicalCurrentUrl || isCanonicalHistoricalUrl ? null : canonicalHref,
  };
}
