import { NextRequest, NextResponse } from "next/server";
import { extractArticleFromUrl } from "@/lib/fetchArticleHtml";
import { readJsonBody } from "@/lib/readJsonBody";

export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody<{ url?: string }>(request);
    if (!parsed.ok) return parsed.response;
    const { url } = parsed.data;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const data = await extractArticleFromUrl(url);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch article: ${message}` }, { status: 500 });
  }
}
