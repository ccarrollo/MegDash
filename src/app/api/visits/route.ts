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

  const body = await request.json();
  const { doctorId, outcome, note } = body as {
    doctorId?: string;
    outcome?: string;
    note?: string;
  };

  if (!doctorId || !outcome) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error: visitError } = await supabase.from("visits").insert({
    doctor_id: doctorId,
    outcome,
    note: note ?? null,
  });

  if (visitError) {
    return NextResponse.json({ error: visitError.message }, { status: 500 });
  }

  if (note?.trim()) {
    await supabase.from("notes").insert({
      doctor_id: doctorId,
      body: note.trim(),
    });
  }

  return NextResponse.json({ ok: true });
}
