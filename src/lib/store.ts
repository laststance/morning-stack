import { configureStore } from "@reduxjs/toolkit";
import editionReducer from "./features/edition-slice";
import uiReducer from "./features/ui-slice";
import bookmarksReducer from "./features/bookmarks-slice";
import hiddenReducer from "./features/hidden-slice";

/**
 * Creates a new Redux store instance.
 * Uses factory pattern (makeStore) for Next.js App Router compatibility —
 * each client-side render gets its own store instance via useRef in StoreProvider.
 */
export const makeStore = () => {
  return configureStore({
    reducer: {
      edition: editionReducer,
      ui: uiReducer,
      bookmarks: bookmarksReducer,
      hidden: hiddenReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
