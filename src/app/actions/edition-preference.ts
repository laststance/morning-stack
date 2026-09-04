"use server";

import { cookies } from "next/headers";

import type { EditionType } from "@/lib/db/schema";
import {
  DEFAULT_EDITION_COOKIE_MAX_AGE_SECONDS,
  DEFAULT_EDITION_COOKIE_NAME,
} from "@/lib/edition-preference/constants";
import { parseSavedEditionType } from "@/lib/edition-preference/parse-saved-edition-type";

/**
 * Persists a Settings selection when the display preference form invokes this server action.
 * @param editionType - Requested MorningStack default from the controlled Settings options.
 * @returns The validated edition type written to the browser cookie.
 * @example
 * await saveDefaultEditionPreference("evening") // => { editionType: "evening" }
 */
export async function saveDefaultEditionPreference(
  editionType: EditionType,
): Promise<{ editionType: EditionType }> {
  const validatedEditionType = parseSavedEditionType(editionType);
  if (!validatedEditionType) {
    throw new Error("Invalid default edition preference");
  }

  const cookieStore = await cookies();
  cookieStore.set(DEFAULT_EDITION_COOKIE_NAME, validatedEditionType, {
    httpOnly: true,
    maxAge: DEFAULT_EDITION_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return { editionType: validatedEditionType };
}
