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
    lunchOrder?: string | null;
    restaurant?: string | null;
    foodNotes?: string | null;
    interactionNotes?: string | null;
    status?: string;
    headcount?: number | null;
    totalCost?: number | null;
  };

  const { data: existing, error: fetchErr } = await supabase
    .from("lunches")
    .select("doctor_id, lunch_date")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Lunch not found" }, { status: 404 });
  }

  const payload: Record<string, string | number | null> = {};
  if (body.lunchDate) payload.lunch_date = body.lunchDate;
  payload.start_time = "12:00:00";
  if ("lunchOrder" in body) payload.lunch_order = body.lunchOrder ?? null;
  if ("restaurant" in body) payload.restaurant = body.restaurant ?? null;
  if ("foodNotes" in body) payload.food_notes = body.foodNotes ?? null;
  if ("interactionNotes" in body) {
    payload.interaction_notes = body.interactionNotes ?? null;
  }
  if (typeof body.status === "string") payload.status = body.status;
  if ("headcount" in body) payload.headcount = body.headcount ?? null;

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

  const newDate = body.lunchDate ?? existing.lunch_date;
  if (existing.doctor_id && body.lunchDate) {
    const doctorPatch: Record<string, string | boolean> = {
      lunch_date: newDate,
    };
    if (body.status === "cancelled") {
      doctorPatch.lunch_scheduled = false;
    } else if (body.status === "scheduled" || body.status === "rescheduled") {
      doctorPatch.lunch_scheduled = true;
    }
    await supabase
      .from("doctors")
      .update(doctorPatch)
      .eq("id", existing.doctor_id);
  }

  return NextResponse.json({ ok: true });
}
