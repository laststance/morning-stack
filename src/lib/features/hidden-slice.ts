import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface HiddenState {
  /** External IDs of individually hidden articles. */
  hiddenArticleIds: string[];
  /** Source names hidden by the user (e.g. "hackernews"). */
  hiddenSources: string[];
  /** Topic keywords hidden by the user. */
  hiddenTopics: string[];
  /** Whether the initial hidden state has been loaded from the server. */
  initialized: boolean;
}

const initialState: HiddenState = {
  hiddenArticleIds: [],
  hiddenSources: [],
  hiddenTopics: [],
  initialized: false,
};

/**
 * Manages client-side hidden item state for optimistic UI filtering.
 *
 * The initial state is loaded from the server via `initializeHidden`,
 * then `hideArticle`, `hideSource`, and `hideTopic` provide instant
 * feedback before the server action confirms persistence.
 */
const hiddenSlice = createSlice({
  name: "hidden",
  initialState,
  reducers: {
    /** Load the initial hidden state from server data. */
    initializeHidden(
      state,
      action: PayloadAction<{
        hiddenArticleIds: string[];
        hiddenSources: string[];
        hiddenTopics: string[];
      }>,
    ) {
      state.hiddenArticleIds = action.payload.hiddenArticleIds;
      state.hiddenSources = action.payload.hiddenSources;
      state.hiddenTopics = action.payload.hiddenTopics;
      state.initialized = true;
    },

    /** Optimistically hide a single article by externalId. */
    hideArticle(state, action: PayloadAction<string>) {
      if (!state.hiddenArticleIds.includes(action.payload)) {
        state.hiddenArticleIds.push(action.payload);
      }
    },

    /** Revert hiding a single article (on server failure). */
    revertHideArticle(state, action: PayloadAction<string>) {
      const index = state.hiddenArticleIds.indexOf(action.payload);
      if (index !== -1) {
        state.hiddenArticleIds.splice(index, 1);
      }
    },

    /** Optimistically hide all articles from a source. */
    hideSource(state, action: PayloadAction<string>) {
      if (!state.hiddenSources.includes(action.payload)) {
        state.hiddenSources.push(action.payload);
      }
    },

    /** Revert hiding a source (on server failure). */
    revertHideSource(state, action: PayloadAction<string>) {
      const index = state.hiddenSources.indexOf(action.payload);
      if (index !== -1) {
        state.hiddenSources.splice(index, 1);
      }
    },

    /** Optimistically hide a topic keyword. */
    hideTopic(state, action: PayloadAction<string>) {
      if (!state.hiddenTopics.includes(action.payload)) {
        state.hiddenTopics.push(action.payload);
      }
    },

    /** Revert hiding a topic (on server failure). */
    revertHideTopic(state, action: PayloadAction<string>) {
      const index = state.hiddenTopics.indexOf(action.payload);
      if (index !== -1) {
        state.hiddenTopics.splice(index, 1);
      }
    },
  },
});

export const {
  initializeHidden,
  hideArticle,
  revertHideArticle,
  hideSource,
  revertHideSource,
  hideTopic,
  revertHideTopic,
} = hiddenSlice.actions;

export default hiddenSlice.reducer;
