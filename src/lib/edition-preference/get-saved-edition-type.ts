import { cookies } from "next/headers";

import type { EditionType } from "@/lib/db/schema";
import { DEFAULT_EDITION_COOKIE_NAME } from "@/lib/edition-preference/constants";
import { parseSavedEditionType } from "@/lib/edition-preference/parse-saved-edition-type";

/**
 * Reads the validated browser preference whenever a server-rendered Home or Settings request needs its default edition.
 * @returns The saved Morning or Evening choice, otherwise `null`.
 * @example
 * await getSavedEditionType() // => "evening"
 */
export async function getSavedEditionType(): Promise<EditionType | null> {
  const cookieStore = await cookies();
  return parseSavedEditionType(
    cookieStore.get(DEFAULT_EDITION_COOKIE_NAME)?.value,
  );
}
