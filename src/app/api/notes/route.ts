import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { doctorId?: string; note?: string };
  const doctorId = body.doctorId?.trim();
  const note = body.note?.trim();
  if (!doctorId || !note) {
    return NextResponse.json(
      { error: "Doctor and note are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("notes").insert({
    doctor_id: doctorId,
    body: note,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
