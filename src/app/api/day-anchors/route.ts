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
    anchorTime?: string | null;
    anchorType?: string;
    label?: string | null;
  };

  if (!body.planDate || !body.doctorId) {
    return NextResponse.json(
      { error: "planDate and doctorId are required" },
      { status: 400 },
    );
  }

  const { data: doctor, error: doctorErr } = await supabase
    .from("doctors")
    .select("facility_id")
    .eq("id", body.doctorId)
    .single();

  if (doctorErr || !doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const { count } = await supabase
    .from("daily_plan_anchors")
    .select("id", { count: "exact", head: true })
    .eq("plan_date", body.planDate);

  const { data, error } = await supabase
    .from("daily_plan_anchors")
    .insert({
      plan_date: body.planDate,
      doctor_id: body.doctorId,
      facility_id: doctor.facility_id,
      anchor_time: body.anchorTime ?? null,
      anchor_type: body.anchorType ?? "lunch",
      label: body.label ?? null,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
