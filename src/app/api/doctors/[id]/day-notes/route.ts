import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Params) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { id: doctorId } = await ctx.params;
  const body = (await request.json()) as {
    noteDate?: string;
    body?: string;
  };

  const noteDate = body.noteDate?.trim();
  if (!noteDate || !/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
    return NextResponse.json({ error: "Valid noteDate is required" }, { status: 400 });
  }

  const text = body.body ?? "";

  const { error } = await supabase.from("doctor_day_notes").upsert(
    {
      doctor_id: doctorId,
      note_date: noteDate,
      body: text,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "doctor_id,note_date" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
