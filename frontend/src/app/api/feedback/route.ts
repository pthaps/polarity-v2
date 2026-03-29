import { NextResponse } from "next/server";
import { appendFeedbackCsv } from "@/lib/feedbackCsv";
import { supabase } from "@/lib/supabase";
import { readJsonBody } from "@/lib/readJsonBody";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await readJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const o = parsed.data;
  const rating = o.rating;
  if (rating !== "yes" && rating !== "no") {
    return NextResponse.json(
      { error: 'rating is required and must be "yes" or "no"' },
      { status: 400 }
    );
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
    return NextResponse.json(
      {
        error:
          "Could not save feedback. Supabase is not configured and the local log could not be written.",
      },
      { status: 500 }
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
    return NextResponse.json(
      {
        error:
          "Could not save feedback. Check the feedback table and RLS policies, or try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, persisted: "database" as const, dbSaved: true });
}
