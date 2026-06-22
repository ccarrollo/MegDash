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
    wholesaleSales?: number;
    revenuePerUnit?: number | null;
    notes?: string | null;
  };

  if (!body.periodYear || !body.periodMonth) {
    return NextResponse.json({ error: "Missing period" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("monthly_goals")
    .select("*")
    .eq("period_year", body.periodYear)
    .eq("period_month", body.periodMonth)
    .maybeSingle();

  const hasAccel = body.accelGoal != null || body.unitGoal != null;
  const hasPhysio = body.physioGoal != null;
  const hasWholesale = body.wholesaleSales != null;

  if (!hasAccel && !hasPhysio && !hasWholesale && body.unitGoal == null) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  const accel =
    body.accelGoal ??
    (body.unitGoal != null && body.physioGoal == null
      ? body.unitGoal
      : (existing?.accel_goal ?? 0));
  const physio = body.physioGoal ?? existing?.physio_goal ?? 0;
  const wholesaleSales =
    body.wholesaleSales != null
      ? Math.max(0, Number(body.wholesaleSales) || 0)
      : Number(existing?.wholesale_sales ?? 0);

  const accelGoal = Number(accel) || 0;
  const physioGoal = Number(physio) || 0;
  const unitGoal = Math.round(accelGoal + physioGoal);

  const { error } = await supabase.from("monthly_goals").upsert(
    {
      period_year: body.periodYear,
      period_month: body.periodMonth,
      unit_goal: unitGoal,
      accel_goal: accelGoal,
      physio_goal: physioGoal,
      wholesale_sales: wholesaleSales,
      revenue_per_unit:
        body.revenuePerUnit !== undefined
          ? body.revenuePerUnit
          : (existing?.revenue_per_unit ?? null),
      notes:
        body.notes !== undefined ? body.notes : (existing?.notes ?? null),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "period_year,period_month" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
