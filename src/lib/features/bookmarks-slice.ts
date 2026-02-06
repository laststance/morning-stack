import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface BookmarksState {
  /** Set of bookmarked article externalIds for fast lookup. */
  bookmarkedIds: string[];
  /** Whether the initial bookmark list has been loaded from the server. */
  initialized: boolean;
}

const initialState: BookmarksState = {
  bookmarkedIds: [],
  initialized: false,
};

/**
 * Manages client-side bookmark state for optimistic UI updates.
 *
 * The initial set of bookmarked IDs is loaded from the server via
 * `initializeBookmarks`, then `toggleBookmark` provides instant
 * feedback before the server action confirms persistence.
 */
const bookmarksSlice = createSlice({
  name: "bookmarks",
  initialState,
  reducers: {
    /** Load the initial set of bookmarked externalIds from server data. */
    initializeBookmarks(state, action: PayloadAction<string[]>) {
      state.bookmarkedIds = action.payload;
      state.initialized = true;
    },
    /** Optimistically toggle a bookmark. */
    toggleBookmark(state, action: PayloadAction<string>) {
      const id = action.payload;
      const index = state.bookmarkedIds.indexOf(id);
      if (index === -1) {
        state.bookmarkedIds.push(id);
      } else {
        state.bookmarkedIds.splice(index, 1);
      }
    },
    /** Revert an optimistic toggle on server action failure. */
    revertBookmark(state, action: PayloadAction<string>) {
      const id = action.payload;
      const index = state.bookmarkedIds.indexOf(id);
      if (index === -1) {
        state.bookmarkedIds.push(id);
      } else {
        state.bookmarkedIds.splice(index, 1);
      }
    },
  },
});

export const { initializeBookmarks, toggleBookmark, revertBookmark } =
  bookmarksSlice.actions;
export default bookmarksSlice.reducer;
