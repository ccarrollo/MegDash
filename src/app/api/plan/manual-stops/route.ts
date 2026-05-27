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
    planDate?: string;
    doctorId?: string;
  };

  if (!body.planDate || !body.doctorId) {
    return NextResponse.json(
      { error: "planDate and doctorId required" },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("daily_plan_manual_stops")
    .select("id")
    .eq("plan_date", body.planDate)
    .eq("doctor_id", body.doctorId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyOnPlan: true });
  }

  const { data: maxRow } = await supabase
    .from("daily_plan_manual_stops")
    .select("sort_order")
    .eq("plan_date", body.planDate)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data: doctor } = await supabase
    .from("doctors")
    .select("follow_up_date")
    .eq("id", body.doctorId)
    .single();

  const followUpDue =
    doctor?.follow_up_date != null &&
    String(doctor.follow_up_date).slice(0, 10) <= body.planDate;

  const { error: insertErr } = await supabase.from("daily_plan_manual_stops").insert({
    plan_date: body.planDate,
    doctor_id: body.doctorId,
    kind: followUpDue ? "follow_up" : "visit",
    sort_order: sortOrder,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const { data: settings } = await supabase
    .from("daily_plan_settings")
    .select("prospect_count")
    .eq("plan_date", body.planDate)
    .maybeSingle();

  await supabase.from("daily_plan_settings").upsert(
    {
      plan_date: body.planDate,
      prospect_count: settings?.prospect_count ?? 6,
      auto_suggestions: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "plan_date" },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    planDate?: string;
    doctorId?: string;
  };

  if (!body.planDate || !body.doctorId) {
    return NextResponse.json(
      { error: "planDate and doctorId required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("daily_plan_manual_stops")
    .delete()
    .eq("plan_date", body.planDate)
    .eq("doctor_id", body.doctorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("daily_plan_stop_times")
    .delete()
    .eq("plan_date", body.planDate)
    .eq("doctor_id", body.doctorId);

  return NextResponse.json({ ok: true });
}
