import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Edition type matching the database enum in schema.ts */
export type EditionType = "morning" | "evening";

interface EditionState {
  /** Current edition type (morning or evening) */
  type: EditionType;
  /** Current edition date as ISO date string (YYYY-MM-DD) */
  date: string;
}

/** Returns today's date as YYYY-MM-DD string */
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

const initialState: EditionState = {
  type: "morning",
  date: getTodayDateString(),
};

/**
 * Manages the currently selected edition (morning/evening) and date.
 * Used by the header tabs and home page to determine which edition to display.
 */
const editionSlice = createSlice({
  name: "edition",
  initialState,
  reducers: {
    setEditionType(state, action: PayloadAction<EditionType>) {
      state.type = action.payload;
    },
    setEditionDate(state, action: PayloadAction<string>) {
      state.date = action.payload;
    },
  },
});

export const { setEditionType, setEditionDate } = editionSlice.actions;
export default editionSlice.reducer;
