import { NextResponse } from "next/server";
import { ensureCoffeeMonthGoal, isCurrentCalendarMonth } from "@/lib/coffee";
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
    doctorId?: string;
    periodYear?: number;
    periodMonth?: number;
    goal?: number;
  };

  if (!body.doctorId || !body.periodYear || !body.periodMonth) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (body.goal == null || !Number.isFinite(body.goal)) {
    return NextResponse.json({ error: "goal is required" }, { status: 400 });
  }

  const goal = Math.max(0, Math.floor(body.goal));

  await ensureCoffeeMonthGoal(
    body.doctorId,
    body.periodYear,
    body.periodMonth,
    goal,
  );

  if (
    isCurrentCalendarMonth(body.periodYear, body.periodMonth)
  ) {
    const { error } = await supabase
      .from("coffee_roster")
      .update({ monthly_goal: goal })
      .eq("doctor_id", body.doctorId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
