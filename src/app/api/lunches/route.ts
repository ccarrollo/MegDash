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
    doctorId?: string;
    facilityId?: string;
    lunchDate?: string;
    startTime?: string | null;
    lunchOrder?: string | null;
    restaurant?: string | null;
    foodNotes?: string | null;
    interactionNotes?: string | null;
    status?: string | null;
    dateTbd?: boolean;
  };

  if (!body.lunchDate || (!body.doctorId && !body.facilityId)) {
    return NextResponse.json(
      { error: "Lunch date and doctor/facility are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("lunches")
    .insert({
      doctor_id: body.doctorId ?? null,
      facility_id: body.facilityId ?? null,
      lunch_date: body.lunchDate,
      start_time: body.startTime ? `${body.startTime}:00` : "12:00:00",
      lunch_order: body.lunchOrder ?? body.restaurant ?? null,
      restaurant: body.restaurant ?? body.lunchOrder ?? null,
      food_notes: body.foodNotes ?? null,
      interaction_notes: body.interactionNotes ?? null,
      status: body.status ?? "scheduled",
      is_date_tbd: Boolean(body.dateTbd),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.doctorId && body.lunchDate) {
    await supabase
      .from("doctors")
      .update({ lunch_date: body.lunchDate, lunch_scheduled: true })
      .eq("id", body.doctorId);
  }

  return NextResponse.json({ ok: true, lunchId: data.id });
}
