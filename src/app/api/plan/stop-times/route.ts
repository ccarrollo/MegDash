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
    doctorId?: string;
    stopKind?: string;
    startTime?: string;
    endTime?: string | null;
  };

  if (!body.planDate || !body.doctorId || !body.stopKind || !body.startTime) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase.from("daily_plan_stop_times").upsert(
    {
      plan_date: body.planDate,
      doctor_id: body.doctorId,
      stop_kind: body.stopKind,
      start_time: body.startTime,
      end_time: body.endTime ?? null,
    },
    { onConflict: "plan_date,doctor_id,stop_kind" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
    stopKind?: string;
  };

  if (!body.planDate || !body.doctorId || !body.stopKind) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("daily_plan_stop_times")
    .delete()
    .eq("plan_date", body.planDate)
    .eq("doctor_id", body.doctorId)
    .eq("stop_kind", body.stopKind);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
