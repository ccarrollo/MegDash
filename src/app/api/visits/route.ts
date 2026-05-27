import { NextResponse } from "next/server";
import { outcomeUpdatesLastVisit } from "@/lib/visitOutcomes";
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

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert({
      doctor_id: doctorId,
      outcome,
      note: note ?? null,
    })
    .select("id")
    .single();

  if (visitError) {
    return NextResponse.json({ error: visitError.message }, { status: 500 });
  }

  if (note?.trim()) {
    await supabase.from("notes").insert({
      doctor_id: doctorId,
      body: note.trim(),
    });
  }

  if (outcome === "order_obtained") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("facility_id")
      .eq("id", doctorId)
      .single();

    await supabase.from("orders").insert({
      doctor_id: doctorId,
      facility_id: doctor?.facility_id ?? null,
      visit_id: visit.id,
      status: "pending",
      pipeline_stage: "order_received",
      source: "visit_log",
      notes: note?.trim() || "Logged from field visit",
    });
  }

  return NextResponse.json({
    ok: true,
    visitId: visit.id,
    updatesLastVisit: outcomeUpdatesLastVisit(outcome),
    createdOrder: outcome === "order_obtained",
  });
}
