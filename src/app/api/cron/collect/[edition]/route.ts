import {
  handleCollectRequest,
  resolveEditionTypeSegment,
} from "@/lib/cron/edition-collector";

/**
 * Collect a fixed edition type so Vercel can schedule unique cron paths.
 * @param request - Incoming request checked against optional CRON_SECRET.
 * @param context - Dynamic route context containing `morning` or `evening`.
 * @returns JSON collection summary or 404 for unsupported edition segments.
 * @example
 * GET(request, { params: Promise.resolve({ edition: "morning" }) });
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ edition: string }> },
) {
  const { edition } = await params;
  const editionType = resolveEditionTypeSegment(edition);

  if (!editionType) {
    return Response.json({ error: "Unsupported edition" }, { status: 404 });
  }

  return handleCollectRequest(request, { editionType });
}
