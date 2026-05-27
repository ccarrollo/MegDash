import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { mapGoalsRows, parseCsv } from "@/lib/importSalesGoals";

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    csv?: string;
    periodYear?: number;
    replaceExisting?: boolean;
  };

  if (!body.csv?.trim()) {
    return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
  }

  const periodYear = body.periodYear ?? new Date().getFullYear();
  const rows = mapGoalsRows(parseCsv(body.csv), periodYear);

  if (!rows.length) {
    return NextResponse.json(
      {
        error:
          "No goal rows found. Export the Goals tab as CSV (needs Month + AS Goal / PS Goal).",
      },
      { status: 400 },
    );
  }

  if (body.replaceExisting) {
    await supabase
      .from("monthly_goals")
      .delete()
      .eq("period_year", periodYear);
  }

  let upserted = 0;
  for (const row of rows) {
    const unitTotal = Math.round(row.accelGoal + row.physioGoal);
    const { error } = await supabase.from("monthly_goals").upsert(
      {
        period_year: row.periodYear,
        period_month: row.periodMonth,
        accel_goal: row.accelGoal,
        physio_goal: row.physioGoal,
        unit_goal: unitTotal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "period_year,period_month" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    upserted += 1;
  }

  return NextResponse.json({ ok: true, upserted, periodYear });
}
