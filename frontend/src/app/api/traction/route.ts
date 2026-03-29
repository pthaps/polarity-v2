import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const [analysesRes, feedbackRes, recentRes] = await Promise.all([
    supabase.from("analyses").select("id", { count: "exact", head: true }),
    supabase.from("feedback").select("rating", { count: "exact" }),
    supabase.from("analyses").select("url, title, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  if (analysesRes.error) console.error("[traction] analyses count", analysesRes.error);
  if (feedbackRes.error) console.error("[traction] feedback", feedbackRes.error);
  if (recentRes.error) console.error("[traction] recent analyses", recentRes.error);

  const totalAnalyses = analysesRes.count ?? 0;
  const feedbackRows = feedbackRes.data ?? [];
  const totalFeedback = feedbackRes.count ?? feedbackRows.length;
  const positiveCount = feedbackRows.filter((r) => r.rating === "yes").length;
  const positiveRate = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : null;
  const recentAnalyses = recentRes.data ?? [];

  return NextResponse.json({ totalAnalyses, totalFeedback, positiveRate, recentAnalyses });
}
