import type { EditionType } from "@/lib/db/schema";

/** Server-confirmed home request state used by queries, Header, and date navigation. */
export interface ResolvedHomeSelection {
  requestedDate: string;
  requestedEditionType: EditionType;
  isHistoricalSelection: boolean;
  allowLatestFallback: boolean;
  redirectHref: string | null;
}

/** Raw App Router search values accepted by the home URL resolver. */
export interface HomeSearchParams {
  date?: string | string[];
  edition?: string | string[];
}
