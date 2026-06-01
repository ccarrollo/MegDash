import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, ctx: Params) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    lunchDate?: string;
    startTime?: string | null;
    dateTbd?: boolean;
    lunchOrder?: string | null;
    restaurant?: string | null;
    foodNotes?: string | null;
    interactionNotes?: string | null;
    status?: string;
    headcount?: number | null;
    totalCost?: number | null;
    doctorId?: string | null;
    facilityId?: string | null;
  };

  const { data: existing, error: fetchErr } = await supabase
    .from("lunches")
    .select("doctor_id, lunch_date, is_date_tbd")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Lunch not found" }, { status: 404 });
  }

  const payload: Record<string, string | number | boolean | null> = {};
  if (body.lunchDate) payload.lunch_date = body.lunchDate;
  if ("startTime" in body) {
    payload.start_time = body.startTime ? `${body.startTime}:00` : null;
  }
  if ("lunchOrder" in body) payload.lunch_order = body.lunchOrder ?? null;
  if ("restaurant" in body) payload.restaurant = body.restaurant ?? null;
  if ("foodNotes" in body) payload.food_notes = body.foodNotes ?? null;
  if ("interactionNotes" in body) {
    payload.interaction_notes = body.interactionNotes ?? null;
  }
  if (typeof body.status === "string") payload.status = body.status;
  if ("dateTbd" in body) {
    payload.is_date_tbd = Boolean(body.dateTbd);
    if (body.dateTbd) {
      payload.status = "rescheduled";
    }
  }
  if ("headcount" in body) payload.headcount = body.headcount ?? null;
  if ("facilityId" in body) payload.facility_id = body.facilityId ?? null;
  if (body.doctorId && body.doctorId !== existing.doctor_id) {
    payload.doctor_id = body.doctorId;
  }

  if ("totalCost" in body) {
    const total = body.totalCost ?? null;
    payload.total_cost = total;
    const heads =
      "headcount" in body ? body.headcount : undefined;
    if (total != null && heads != null && heads > 0) {
      payload.cost_per_head = Math.round((total / heads) * 100) / 100;
    } else if (total == null) {
      payload.cost_per_head = null;
    }
  } else if ("headcount" in body && body.headcount != null) {
    const { data: row } = await supabase
      .from("lunches")
      .select("total_cost")
      .eq("id", id)
      .single();
    const total = row?.total_cost as number | null;
    if (total != null && body.headcount! > 0) {
      payload.cost_per_head =
        Math.round((total / body.headcount!) * 100) / 100;
    }
  }

  const { error } = await supabase.from("lunches").update(payload).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const isDateTbd = body.dateTbd ?? existing.is_date_tbd ?? false;
  const newDate = body.lunchDate ?? existing.lunch_date;
  const planDate = newDate ? String(newDate).slice(0, 10) : null;

  if (
    existing.doctor_id &&
    body.doctorId &&
    body.doctorId !== existing.doctor_id &&
    planDate
  ) {
    await supabase
      .from("doctors")
      .update({ lunch_scheduled: false, lunch_date: null })
      .eq("id", existing.doctor_id);
    await supabase
      .from("doctors")
      .update({ lunch_scheduled: true, lunch_date: planDate })
      .eq("id", body.doctorId);
  }

  if (
    existing.doctor_id &&
    ("lunchDate" in body || "status" in body || "dateTbd" in body)
  ) {
    const doctorPatch: Record<string, string | boolean | null> = {
      lunch_date: isDateTbd ? null : newDate ?? null,
    };
    if (body.status === "cancelled") {
      doctorPatch.lunch_scheduled = false;
    } else if (
      body.status === "scheduled" ||
      body.status === "rescheduled" ||
      body.dateTbd
    ) {
      doctorPatch.lunch_scheduled = true;
    }
    const targetDoctorId = body.doctorId ?? existing.doctor_id;
    await supabase
      .from("doctors")
      .update(doctorPatch)
      .eq("id", targetDoctorId);
  }

  return NextResponse.json({ ok: true });
}
