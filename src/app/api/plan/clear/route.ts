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

  const body = (await request.json()) as { planDate?: string };
  if (!body.planDate) {
    return NextResponse.json({ error: "planDate required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("daily_plan_settings")
    .select("prospect_count")
    .eq("plan_date", body.planDate)
    .maybeSingle();

  const { error: settingsErr } = await supabase.from("daily_plan_settings").upsert(
    {
      plan_date: body.planDate,
      prospect_count: existing?.prospect_count ?? 6,
      auto_suggestions: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_date" },
  );
  if (settingsErr) {
    return NextResponse.json({ error: settingsErr.message }, { status: 500 });
  }

  await supabase
    .from("daily_plan_manual_stops")
    .delete()
    .eq("plan_date", body.planDate);

  await supabase
    .from("daily_plan_stop_times")
    .delete()
    .eq("plan_date", body.planDate);

  return NextResponse.json({ ok: true });
}
