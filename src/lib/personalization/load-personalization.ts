import type { HiddenStateSnapshot } from "@/lib/personalization/hidden-state-snapshot";

/** Route dependencies that resolve one session and then load bookmark/hidden rows concurrently by user ID. */
export interface PersonalizationDependencies {
  getUserId: () => Promise<string | null>;
  getBookmarkedArticleIdsByUserId: (userId: string) => Promise<string[]>;
  getHiddenStateByUserId: (userId: string) => Promise<HiddenStateSnapshot>;
}

/** Known personalization data for signed-out or successfully loaded signed-in readers. */
export interface AvailablePersonalization {
  status: "available";
  isSignedIn: boolean;
  bookmarkedArticleIds: string[];
  hiddenState: HiddenStateSnapshot;
}

/** Warning state that intentionally carries no guessed bookmark/hidden labels. */
export interface UnavailablePersonalization {
  status: "unavailable";
}

/** Personalization state rendered independently from public edition availability. */
export type PersonalizationResult =
  | AvailablePersonalization
  | UnavailablePersonalization;

/**
 * Loads optional personalization once per HomePage render so account failures never hide the public feed or fabricate saved/hidden labels.
 * @param dependencies - Auth and user-scoped query boundary supplied by the route.
 * @returns Known available data or a non-blocking unavailable warning state.
 * @example
 * await loadPersonalization({ getUserId, getBookmarkedArticleIdsByUserId, getHiddenStateByUserId })
 */
export async function loadPersonalization(
  dependencies: PersonalizationDependencies,
): Promise<PersonalizationResult> {
  try {
    const userId = await dependencies.getUserId();

    // Public readers have a known empty state and require no account-table queries.
    if (!userId) {
      return {
        status: "available",
        isSignedIn: false,
        bookmarkedArticleIds: [],
        hiddenState: {
          hiddenArticleIds: [],
          hiddenSources: [],
          hiddenTopics: [],
        },
      };
    }

    const [bookmarkedArticleIds, hiddenState] = await Promise.all([
      dependencies.getBookmarkedArticleIdsByUserId(userId),
      dependencies.getHiddenStateByUserId(userId),
    ]);

    return {
      status: "available",
      isSignedIn: true,
      bookmarkedArticleIds,
      hiddenState,
    };
  } catch (error) {
    console.error("[HomePage] Personalization unavailable:", error);
    return { status: "unavailable" };
  }
}
