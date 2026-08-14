import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { EditionType } from "@/lib/db/schema";

export type { EditionType } from "@/lib/db/schema";

interface EditionState {
  /** Current edition type (morning or evening) */
  type: EditionType;
  /** Current edition date as ISO date string (YYYY-MM-DD) */
  date: string;
}

/**
 * Returns the current JST date used before server edition data hydrates Redux.
 * @returns Date string in `YYYY-MM-DD` format for Asia/Tokyo.
 * @example
 * getTodayDateString() // => "2026-06-17"
 */
function getTodayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
