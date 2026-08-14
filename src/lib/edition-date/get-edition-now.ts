import { parseCivilDate } from "@/lib/edition-date/parse-civil-date";

/**
 * Reads the guarded fixed E2E clock when HomePage renders in non-production, otherwise returns real time; Cron never imports this adapter.
 * @returns Real time, or 09:00 JST on `E2E_TODAY_JST` when the explicit non-production E2E guard is enabled.
 * @example
 * getEditionNow() // => Date
 */
export function getEditionNow(): Date {
  const e2eTodayJst = process.env.E2E_TODAY_JST;
  if (!e2eTodayJst || process.env.NODE_ENV === "production") {
    return new Date();
  }

  // A fixed clock is accepted only in explicit E2E mode to prevent accidental local/runtime overrides.
  if (process.env.MORNINGSTACK_E2E !== "true") {
    throw new Error("E2E_TODAY_JST requires MORNINGSTACK_E2E=true");
  }

  if (!parseCivilDate(e2eTodayJst)) {
    throw new Error("E2E_TODAY_JST must be a real YYYY-MM-DD civil date");
  }

  return new Date(`${e2eTodayJst}T09:00:00+09:00`);
}
