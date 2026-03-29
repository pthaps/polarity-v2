import { NextResponse } from "next/server";

// Trending articles endpoint — returns most-analyzed domains this week
// Aggregates from Supabase analyses table, grouped by domain
export async function GET() {
  return NextResponse.json({ message: "Coming soon" }, { status: 501 });
}