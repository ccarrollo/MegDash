import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function PUT(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    periodYear?: number;
    periodMonth?: number;
    unitGoal?: number;
    accelGoal?: number;
    physioGoal?: number;
    revenuePerUnit?: number | null;
    notes?: string | null;
  };

  if (!body.periodYear || !body.periodMonth) {
    return NextResponse.json({ error: "Missing period" }, { status: 400 });
  }

  const accel =
    body.accelGoal ??
    (body.unitGoal != null && body.physioGoal == null ? body.unitGoal : null);
  const physio = body.physioGoal ?? 0;

  if (accel == null && body.unitGoal == null) {
    return NextResponse.json({ error: "Missing goal" }, { status: 400 });
  }

  const accelGoal = accel ?? 0;
  const physioGoal = physio;
  const unitGoal = Math.round(accelGoal + physioGoal);

  const { error } = await supabase.from("monthly_goals").upsert(
    {
      period_year: body.periodYear,
      period_month: body.periodMonth,
      unit_goal: unitGoal,
      accel_goal: accelGoal,
      physio_goal: physioGoal,
      revenue_per_unit: body.revenuePerUnit ?? null,
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "period_year,period_month" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
