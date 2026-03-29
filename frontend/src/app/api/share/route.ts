import { NextResponse } from "next/server";

// Share endpoint — generates a shareable link for an analysis report
// POST /api/share with analysisId, returns a short URL
export async function POST() {
  return NextResponse.json({ message: "Coming soon" }, { status: 501 });
}
