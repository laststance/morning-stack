/** Minimal article identity needed to recognize one authoritative bookmark-page snapshot. */
export interface BookmarkSnapshotArticle {
  /** Persisted article primary key shown on the bookmark page. */
  id: string;
}

/** Identifies one optimistic removal so late responses cannot alter a newer server snapshot. */
export interface BookmarkRemovalRequest {
  /** Persisted article primary key being removed. */
  articleId: string;
  /** Revision-scoped identifier used to make repeated responses idempotent. */
  requestId: string;
  /** Server snapshot revision that owned the initiating click. */
  snapshotRevision: number;
}

/** Request-safe optimistic removal state owned by one server-provided article array. */
export interface OptimisticBookmarkRemovalState {
  /** Exact server-provided article array used to detect a route refresh. */
  articleSnapshot: readonly BookmarkSnapshotArticle[];
  /** Monotonic local generation that invalidates responses from older arrays. */
  snapshotRevision: number;
  /** Article IDs kept hidden until their successful response is server-confirmed. */
  removedArticleIds: readonly string[];
  /** Request IDs still allowed to settle in this snapshot revision. */
  pendingRequestIds: readonly string[];
  /** Failed article IDs that the component must restore in Redux. */
  rollbackArticleIds: readonly string[];
}

/** Events that advance optimistic removals without allowing stale request responses to mutate current state. */
export type OptimisticBookmarkRemovalAction =
  | {
      type: "replace-snapshot";
      articleSnapshot: readonly BookmarkSnapshotArticle[];
    }
  | { type: "start"; request: BookmarkRemovalRequest }
  | { type: "succeed"; request: BookmarkRemovalRequest }
  | { type: "fail"; request: BookmarkRemovalRequest };

/**
 * Creates optimistic removal state whenever BookmarksContent receives its first authoritative article snapshot.
 * @param articleSnapshot - Server-rendered bookmarked articles for the current route render.
 * @returns Empty optimistic state owned by that exact snapshot array.
 * @example
 * createOptimisticBookmarkRemovalState([{ id: "article-a" }])
 */
export function createOptimisticBookmarkRemovalState(
  articleSnapshot: readonly BookmarkSnapshotArticle[],
): OptimisticBookmarkRemovalState {
  return {
    articleSnapshot,
    snapshotRevision: 0,
    removedArticleIds: [],
    pendingRequestIds: [],
    rollbackArticleIds: [],
  };
}

/**
 * Creates a snapshot-scoped request token immediately before a bookmark-page removal starts.
 * @param state - Current optimistic removal state from the component reducer.
 * @param articleId - Persisted article ID being removed.
 * @returns Request identity used by start/success/failure reducer events.
 * @example
 * createBookmarkRemovalRequest(state, "article-a")
 */
export function createBookmarkRemovalRequest(
  state: OptimisticBookmarkRemovalState,
  articleId: string,
): BookmarkRemovalRequest {
  return {
    articleId,
    requestId: `${state.snapshotRevision}:${articleId}`,
    snapshotRevision: state.snapshotRevision,
  };
}

/**
 * Applies optimistic removal events while ignoring duplicate responses and responses owned by an older server snapshot.
 * @param state - Current snapshot-scoped optimistic state.
 * @param action - Snapshot replacement or request lifecycle event.
 * @returns Next immutable optimistic state, or the same state when an event is stale/duplicate.
 * @example
 * optimisticBookmarkRemovalReducer(state, { type: "start", request })
 */
export function optimisticBookmarkRemovalReducer(
  state: OptimisticBookmarkRemovalState,
  action: OptimisticBookmarkRemovalAction,
): OptimisticBookmarkRemovalState {
  if (action.type === "replace-snapshot") {
    if (action.articleSnapshot === state.articleSnapshot) return state;

    // New server data cancels every request and rollback owned by the previous render.
    return {
      articleSnapshot: action.articleSnapshot,
      snapshotRevision: state.snapshotRevision + 1,
      removedArticleIds: [],
      pendingRequestIds: [],
      rollbackArticleIds: [],
    };
  }

  // Late responses from an older server render must not change the visible or Redux state.
  if (action.request.snapshotRevision !== state.snapshotRevision) return state;

  if (action.type === "start") {
    if (state.pendingRequestIds.includes(action.request.requestId))
      return state;

    return {
      ...state,
      removedArticleIds: state.removedArticleIds.includes(
        action.request.articleId,
      )
        ? state.removedArticleIds
        : [...state.removedArticleIds, action.request.articleId],
      pendingRequestIds: [...state.pendingRequestIds, action.request.requestId],
      rollbackArticleIds: state.rollbackArticleIds.includes(
        action.request.articleId,
      )
        ? state.rollbackArticleIds.filter(
            (articleId) => articleId !== action.request.articleId,
          )
        : state.rollbackArticleIds,
    };
  }

  // Duplicate or already-cancelled responses are idempotent no-ops.
  if (!state.pendingRequestIds.includes(action.request.requestId)) return state;

  if (action.type === "succeed") {
    return {
      ...state,
      pendingRequestIds: state.pendingRequestIds.filter(
        (requestId) => requestId !== action.request.requestId,
      ),
    };
  }

  return {
    ...state,
    removedArticleIds: state.removedArticleIds.filter(
      (articleId) => articleId !== action.request.articleId,
    ),
    pendingRequestIds: state.pendingRequestIds.filter(
      (requestId) => requestId !== action.request.requestId,
    ),
    rollbackArticleIds: state.rollbackArticleIds.includes(
      action.request.articleId,
    )
      ? state.rollbackArticleIds
      : [...state.rollbackArticleIds, action.request.articleId],
  };
}

/**
 * Normalizes rejected and unsuccessful Server Actions into the same rollback signal for the optimistic reducer.
 * @param request - Deferred removeBookmark Server Action invocation.
 * @returns True only when the Server Action resolves with success.
 * @example
 * await runBookmarkRemovalRequest(() => removeBookmark("article-a"))
 */
export async function runBookmarkRemovalRequest(
  request: () => Promise<{ success: boolean }>,
): Promise<boolean> {
  try {
    return (await request()).success;
  } catch {
    return false;
  }
}
