import { NextResponse } from "next/server";
import { ensureCoffeeMonthGoal, isCurrentCalendarMonth } from "@/lib/coffee";
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
    monthlyGoal?: number;
    notes?: string | null;
  };

  if (!body.doctorId) {
    return NextResponse.json({ error: "doctorId is required" }, { status: 400 });
  }

  const monthlyGoal =
    body.monthlyGoal != null && Number.isFinite(body.monthlyGoal)
      ? Math.max(0, Math.floor(body.monthlyGoal))
      : 1;

  const { data, error } = await supabase
    .from("coffee_roster")
    .insert({
      doctor_id: body.doctorId,
      monthly_goal: monthlyGoal,
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    const msg =
      error.code === "23505"
        ? "Doctor is already on the coffee list"
        : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const now = new Date();
  await ensureCoffeeMonthGoal(
    body.doctorId,
    now.getFullYear(),
    now.getMonth() + 1,
    monthlyGoal,
  );

  return NextResponse.json({ ok: true, id: data.id });
}
