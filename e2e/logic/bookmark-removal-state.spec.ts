import { expect, test } from "@playwright/test";

import {
  createBookmarkRemovalRequest,
  createOptimisticBookmarkRemovalState,
  optimisticBookmarkRemovalReducer,
  runBookmarkRemovalRequest,
} from "@/lib/bookmarks/optimistic-removal-state";
import bookmarksReducer, {
  initializeBookmarks,
  restoreBookmark,
} from "@/lib/features/bookmarks-slice";

test("overlapping bookmark removals keep the successful article hidden and restore only the failed article", () => {
  // Arrange
  const articleSnapshot = [{ id: "article-a" }, { id: "article-b" }];
  let state = createOptimisticBookmarkRemovalState(articleSnapshot);
  const successfulRequest = createBookmarkRemovalRequest(state, "article-a");
  const failedRequest = createBookmarkRemovalRequest(state, "article-b");
  state = optimisticBookmarkRemovalReducer(state, {
    type: "start",
    request: successfulRequest,
  });
  state = optimisticBookmarkRemovalReducer(state, {
    type: "start",
    request: failedRequest,
  });

  // Act
  state = optimisticBookmarkRemovalReducer(state, {
    type: "succeed",
    request: successfulRequest,
  });
  state = optimisticBookmarkRemovalReducer(state, {
    type: "fail",
    request: failedRequest,
  });

  // Assert
  expect(state).toEqual({
    articleSnapshot,
    snapshotRevision: 0,
    removedArticleIds: ["article-a"],
    pendingRequestIds: [],
    rollbackArticleIds: ["article-b"],
  });
});

test("a removal failure from an older server snapshot cannot restore stale bookmark state", () => {
  // Arrange
  const firstSnapshot = [{ id: "article-a" }];
  const refreshedSnapshot = [{ id: "article-b" }];
  let state = createOptimisticBookmarkRemovalState(firstSnapshot);
  const staleRequest = createBookmarkRemovalRequest(state, "article-a");
  state = optimisticBookmarkRemovalReducer(state, {
    type: "start",
    request: staleRequest,
  });
  state = optimisticBookmarkRemovalReducer(state, {
    type: "replace-snapshot",
    articleSnapshot: refreshedSnapshot,
  });

  // Act
  state = optimisticBookmarkRemovalReducer(state, {
    type: "fail",
    request: staleRequest,
  });

  // Assert
  expect(state).toEqual({
    articleSnapshot: refreshedSnapshot,
    snapshotRevision: 1,
    removedArticleIds: [],
    pendingRequestIds: [],
    rollbackArticleIds: [],
  });
});

test("rejected bookmark removal requests produce the same rollback signal as unsuccessful responses", async () => {
  // Arrange
  const rejectedRequest = async (): Promise<{ success: boolean }> => {
    throw new Error("network unavailable");
  };
  const unsuccessfulRequest = async (): Promise<{ success: boolean }> => ({
    success: false,
  });

  // Act
  const rejectedDidRemove = await runBookmarkRemovalRequest(rejectedRequest);
  const unsuccessfulDidRemove =
    await runBookmarkRemovalRequest(unsuccessfulRequest);

  // Assert
  expect(rejectedDidRemove).toBe(false);
  expect(unsuccessfulDidRemove).toBe(false);
});

test("restoring the same failed bookmark more than once never toggles it back off", () => {
  // Arrange
  let state = bookmarksReducer(undefined, initializeBookmarks([]));

  // Act
  state = bookmarksReducer(state, restoreBookmark("article-b"));
  state = bookmarksReducer(state, restoreBookmark("article-b"));

  // Assert
  expect(state.bookmarkedIds).toEqual(["article-b"]);
});
