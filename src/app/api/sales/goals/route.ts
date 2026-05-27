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

  const body = (await request.json()) as {
    periodYear?: number;
    periodMonth?: number;
    label?: string;
    targetUnits?: number | null;
    targetRevenue?: number | null;
    actualUnits?: number | null;
    notes?: string | null;
  };

  if (!body.periodYear || !body.periodMonth || !body.label?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase.from("sales_goals").upsert(
    {
      period_year: body.periodYear,
      period_month: body.periodMonth,
      label: body.label.trim(),
      target_units: body.targetUnits ?? null,
      target_revenue: body.targetRevenue ?? null,
      actual_units: body.actualUnits ?? 0,
      notes: body.notes ?? null,
    },
    { onConflict: "period_year,period_month,label" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
