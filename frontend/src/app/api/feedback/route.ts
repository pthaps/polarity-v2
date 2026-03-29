import { NextResponse } from "next/server";
import { appendFeedbackCsv } from "@/lib/feedbackCsv";
import { supabase } from "@/lib/supabase";
import { readJsonBody } from "@/lib/readJsonBody";
import { jsonError, logRouteError } from "@/lib/apiErrors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(request);
    if (!parsed.ok) return parsed.response;
    const o = parsed.data;
    const rating = o.rating;
    if (rating !== "yes" && rating !== "no") {
      return jsonError('rating is required and must be "yes" or "no"', 400, { code: "BAD_REQUEST" });
    }

    const url = typeof o.url === "string" ? o.url.slice(0, 8000) : "";
    const title = typeof o.title === "string" ? o.title.slice(0, 2000) : "";
    const commentRaw = typeof o.comment === "string" ? o.comment.trim() : "";
    const comment = commentRaw.length > 0 ? commentRaw.slice(0, 8000) : null;

    let csvSaved = false;
    try {
      await appendFeedbackCsv({
        url,
        title,
        rating,
        comment,
      });
      csvSaved = true;
    } catch (e) {
      console.error("feedback CSV append failed", e);
    }

    if (!supabase) {
      if (csvSaved) {
        return NextResponse.json({ ok: true, persisted: "csv" as const });
      }
      return jsonError(
        "Could not save feedback. Supabase is not configured and the local log could not be written.",
        500,
        { code: "NO_PERSISTENCE_BACKEND" }
      );
    }

    const { error } = await supabase.from("feedback").insert({
      url,
      title: title || null,
      rating,
      comment,
    });

    if (error) {
      console.error("feedback insert", error);
      if (csvSaved) {
        return NextResponse.json({
          ok: true,
          persisted: "csv" as const,
          dbSaved: false,
        });
      }
      return jsonError(
        "Could not save feedback. Check the feedback table and RLS policies, or try again.",
        500,
        { code: "FEEDBACK_INSERT_FAILED" }
      );
    }

    return NextResponse.json({ ok: true, persisted: "database" as const, dbSaved: true });
  } catch (e) {
    logRouteError("feedback", e);
    return jsonError("Unexpected error while saving feedback", 500, { code: "INTERNAL" });
  }
}
