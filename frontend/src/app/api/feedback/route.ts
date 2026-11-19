import { NextResponse } from "next/server";
import { appendFeedbackCsv } from "@/lib/feedbackCsv";
import { supabase } from "@/lib/supabase";
import { readJsonBody } from "@/lib/readJsonBody";
import { enforceRateLimit } from "@/lib/rateLimit";
import { isOptionalText } from "@/lib/apiInput";
import { jsonError, logRouteError } from "@/lib/apiErrors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const blocked = await enforceRateLimit(request, "feedback");
    if (blocked) return blocked;
    const parsed = await readJsonBody<Record<string, unknown>>(request, 112 * 1024);
    if (!parsed.ok) return parsed.response;
    const o = parsed.data;
    const rating = o.rating;
    if (rating !== "yes" && rating !== "no") {
      return jsonError('rating is required and must be "yes" or "no"', 400, { code: "BAD_REQUEST" });
    }

    if (!isOptionalText(o.url, 8000) || !isOptionalText(o.title, 2000) ||
        (o.comment !== null && !isOptionalText(o.comment, 8000))) {
      return jsonError("Invalid feedback fields", 400, { code: "BAD_REQUEST" });
    }
    const url = o.url ?? "";
    const title = o.title ?? "";
    const comment = o.comment?.trim() || null;

    let csvSaved = false;
    try {
      await appendFeedbackCsv({
        url,
        title,
        rating,
        comment,
      });
      csvSaved = true;
    } catch {
      console.error("[feedback] CSV append failed");
    }

    if (!supabase) {
      if (csvSaved) {
        return NextResponse.json({ ok: true, persisted: "csv" as const });
      }
      return jsonError(
        "Could not save feedback",
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
      console.error("[feedback] database insert failed");
      if (csvSaved) {
        return NextResponse.json({
          ok: true,
          persisted: "csv" as const,
          dbSaved: false,
        });
      }
      return jsonError(
        "Could not save feedback",
        500,
        { code: "FEEDBACK_INSERT_FAILED" }
      );
    }

    return NextResponse.json({ ok: true, persisted: "database" as const, dbSaved: true });
  } catch {
    logRouteError("feedback");
    return jsonError("Unexpected error while saving feedback", 500, { code: "INTERNAL" });
  }
}
