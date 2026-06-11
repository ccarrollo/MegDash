import { NextResponse } from "next/server";
import { ensureCoffeeMonthGoal } from "@/lib/coffee";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    doctorId?: string;
    deliveredOn?: string;
    notes?: string | null;
  };

  if (!body.doctorId) {
    return NextResponse.json({ error: "doctorId is required" }, { status: 400 });
  }

  const deliveredOn =
    body.deliveredOn?.trim() ||
    new Date().toISOString().slice(0, 10);

  const { data: rosterRow } = await supabase
    .from("coffee_roster")
    .select("monthly_goal")
    .eq("doctor_id", body.doctorId)
    .maybeSingle();

  if (!rosterRow) {
    return NextResponse.json(
      { error: "Doctor is not on the coffee list" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("coffee_deliveries")
    .insert({
      doctor_id: body.doctorId,
      delivered_on: deliveredOn,
      notes: body.notes?.trim() || null,
    })
    .select("id, delivered_on")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [y, m] = deliveredOn.split("-").map((n) => parseInt(n, 10));
  if (Number.isFinite(y) && Number.isFinite(m)) {
    await ensureCoffeeMonthGoal(
      body.doctorId,
      y,
      m,
      rosterRow.monthly_goal as number,
    );
  }

  return NextResponse.json({ ok: true, delivery: data });
}
