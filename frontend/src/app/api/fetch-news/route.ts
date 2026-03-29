import { NextRequest, NextResponse } from "next/server";
import { extractArticleFromUrl } from "@/lib/fetchArticleHtml";
import { readJsonBody } from "@/lib/readJsonBody";
import { jsonError, logRouteError } from "@/lib/apiErrors";

export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody<{ url?: string }>(request);
    if (!parsed.ok) return parsed.response;
    const { url } = parsed.data;
    if (!url || typeof url !== "string") {
      return jsonError("URL is required", 400, { code: "BAD_REQUEST" });
    }

    try {
      new URL(url);
    } catch {
      return jsonError("Invalid URL", 400, { code: "INVALID_URL" });
    }

    try {
      const data = await extractArticleFromUrl(url);
      return NextResponse.json(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      logRouteError("fetch-news", e);
      return jsonError(`Could not fetch or parse article: ${message}`, 502, { code: "UPSTREAM_FETCH" });
    }
  } catch (e) {
    logRouteError("fetch-news", e);
    return jsonError("Unexpected error in fetch-news", 500, { code: "INTERNAL" });
  }
}
