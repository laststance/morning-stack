import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type Theme = "dark" | "light";

interface UiState {
  /** Current color theme */
  theme: Theme;
  /** Whether the mobile sidebar/hamburger menu is open */
  sidebarOpen: boolean;
  /** ID of the article whose share menu is currently expanded, or null */
  shareMenuArticleId: string | null;
}

const initialState: UiState = {
  theme: "dark",
  sidebarOpen: false,
  shareMenuArticleId: null,
};

/**
 * Manages UI-level state: theme, sidebar visibility, and share menu expansion.
 * These are purely client-side concerns that don't need server persistence.
 */
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setShareMenuArticleId(state, action: PayloadAction<string | null>) {
      state.shareMenuArticleId = action.payload;
    },
  },
});

export const { setTheme, toggleSidebar, setSidebarOpen, setShareMenuArticleId } =
  uiSlice.actions;
export default uiSlice.reducer;
