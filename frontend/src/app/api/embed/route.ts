import { NextResponse } from "next/server";

// Embed widget endpoint — returns SVG bias badge for publishers
// GET /api/embed?domain=nytimes.com
export async function GET() {
  return NextResponse.json({ message: "Coming soon" }, { status: 501 });
}