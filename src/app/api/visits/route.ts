import { NextResponse } from "next/server";
import { outcomeUpdatesLastContact, outcomeUpdatesLastVisit } from "@/lib/visitOutcomes";
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
  const { doctorId, outcome, note, tags, outcomes } = body as {
    doctorId?: string;
    outcome?: string;
    note?: string;
    tags?: string[];
    outcomes?: string[];
  };

  if (!doctorId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const normalizedTags = Array.from(
    new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
  );

  const normalizedOutcomes = Array.from(
    new Set((outcomes ?? []).map((value) => value.trim()).filter(Boolean)),
  );

  if (!outcome && normalizedOutcomes.length === 0) {
    return NextResponse.json({ error: "At least one outcome is required" }, { status: 400 });
  }

  const outcomesToInsert = Array.from(
    new Set(
      [outcome, ...normalizedOutcomes, ...normalizedTags].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );

  const inserts = outcomesToInsert.map((value) => ({
    doctor_id: doctorId,
    outcome: value,
    note: note ?? null,
  }));

  const { data: visits, error: visitError } = await supabase
    .from("visits")
    .insert(inserts)
    .select("id,outcome");

  if (visitError) {
    return NextResponse.json({ error: visitError.message }, { status: 500 });
  }

  if (note?.trim()) {
    await supabase.from("notes").insert({
      doctor_id: doctorId,
      body: note.trim(),
    });
  }

  const primaryVisitId = visits?.[0]?.id;

  return NextResponse.json({
    ok: true,
    visitId: primaryVisitId ?? null,
    updatesLastVisit: outcomesToInsert.some((value) => outcomeUpdatesLastVisit(value)),
    updatesLastContact: outcomesToInsert.some((value) =>
      outcomeUpdatesLastContact(value),
    ),
  });
}
