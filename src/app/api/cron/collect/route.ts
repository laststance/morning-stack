import { handleCollectRequest } from "@/lib/cron/edition-collector";

/**
 * Collect the current JST morning/evening edition for manual cron kicks.
 * @param request - Incoming request checked against optional CRON_SECRET.
 * @returns JSON collection summary for the current time-derived edition.
 * @example
 * GET(request);
 */
export async function GET(request: Request) {
  return handleCollectRequest(request);
}
