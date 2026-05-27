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
    planDate?: string;
    prospectCount?: number;
  };

  if (!body.planDate || body.prospectCount == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const count = Math.min(12, Math.max(1, Math.round(body.prospectCount)));

  const { data: existing } = await supabase
    .from("daily_plan_settings")
    .select("auto_suggestions")
    .eq("plan_date", body.planDate)
    .maybeSingle();

  const { error } = await supabase.from("daily_plan_settings").upsert(
    {
      plan_date: body.planDate,
      prospect_count: count,
      auto_suggestions: existing?.auto_suggestions ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_date" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prospectCount: count });
}
