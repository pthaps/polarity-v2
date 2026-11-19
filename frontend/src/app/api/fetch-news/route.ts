import { NextRequest, NextResponse } from "next/server";
import { extractArticleFromUrl } from "@/lib/fetchArticleHtml";
import { readJsonBody } from "@/lib/readJsonBody";
import { jsonError, logRouteError } from "@/lib/apiErrors";
import { parseArticleUrl } from "@/lib/apiInput";
import { enforceRateLimit } from "@/lib/rateLimit";

export const maxDuration = 20;

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "fetch-news");
  if (blocked) return blocked;
  const parsed = await readJsonBody<{ url?: unknown }>(request, 16 * 1024);
  if (!parsed.ok) return parsed.response;
  const url = parseArticleUrl(parsed.data.url);
  if (!url) return jsonError("A valid HTTP(S) article URL is required", 400, { code: "INVALID_URL" });
  try {
    return NextResponse.json(await extractArticleFromUrl(url.href));
  } catch {
    logRouteError("fetch-news");
    return jsonError("Could not fetch or parse article", 502, { code: "UPSTREAM_FETCH" });
  }
}
