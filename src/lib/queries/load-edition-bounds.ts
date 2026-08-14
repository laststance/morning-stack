/** Shared archive lower bound returned independently from article content. */
export type EditionBoundsResult =
  | { status: "available"; earliestPublishedDate: string | null }
  | { status: "unavailable" };

/**
 * Loads Home date-navigation bounds independently so a failure disables controls without replacing readable found/missing content.
 * @param getEarliestPublishedEditionDate - Minimal published-date query supplied by the route.
 * @returns Available lower bound (including an empty archive) or retryable unavailable state.
 * @example
 * await loadEditionBounds(getEarliestPublishedEditionDate)
 */
export async function loadEditionBounds(
  getEarliestPublishedEditionDate: () => Promise<string | null>,
): Promise<EditionBoundsResult> {
  try {
    return {
      status: "available",
      earliestPublishedDate: await getEarliestPublishedEditionDate(),
    };
  } catch (error) {
    console.error("[HomePage] Edition date bounds unavailable:", error);
    return { status: "unavailable" };
  }
}
