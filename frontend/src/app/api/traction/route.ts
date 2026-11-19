import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { jsonError, logRouteError } from "@/lib/apiErrors";

export const revalidate = 60;

export async function GET() {
  try {
    if (!supabase) return jsonError("Metrics unavailable", 503);
    const [analyses, feedback, positive] = await Promise.all([
      supabase.from("analyses").select("id", { count: "exact", head: true }),
      supabase.from("feedback").select("id", { count: "exact", head: true }),
      supabase.from("feedback").select("id", { count: "exact", head: true }).eq("rating", "yes"),
    ]);
    if (analyses.error || feedback.error || positive.error) throw new Error("Metrics unavailable");
    const totalAnalyses = analyses.count ?? 0;
    const totalFeedback = feedback.count ?? 0;
    const positiveRate = totalFeedback > 0 ? Math.min(100, Math.round((positive.count ?? 0) / totalFeedback * 100)) : null;
    return NextResponse.json({ totalAnalyses, totalFeedback, positiveRate });
  } catch {
    logRouteError("traction");
    return jsonError("Metrics unavailable", 503);
  }
}
