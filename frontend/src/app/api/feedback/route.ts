import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY (service role or anon with insert policy on feedback).",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
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

  const { error } = await supabase.from("feedback").insert({
    url,
    title: title || null,
    rating,
    comment,
  });

  if (error) {
    console.error("feedback insert", error);
    return NextResponse.json(
      { error: "Could not save feedback. Check the feedback table and RLS policies." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
