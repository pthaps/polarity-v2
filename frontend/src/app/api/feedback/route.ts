import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      url: string;
      title: string;
      rating: "up" | "down";
      comment?: string;
    };

    const { url, title, rating, comment } = body;

    if (!rating || !["up", "down"].includes(rating)) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    if (supabase) {
      await supabase.from("feedback").insert({
        url: url || "paste://article",
        title: title || "",
        rating,
        comment: comment?.trim() || null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
