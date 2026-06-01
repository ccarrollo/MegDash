import { NextResponse } from "next/server";
import { buildAnchorInsertRow } from "@/lib/anchorDb";
import {
  isMealAnchorType,
  lunchPayloadFromMeal,
  parseMealNumbers,
  type MealAnchorInput,
} from "@/lib/mealAnchor";
import { getSupabase } from "@/lib/supabase";

function mealFromBody(body: {
  restaurant?: string | null;
  foodNotes?: string | null;
  interactionNotes?: string | null;
  headcount?: number | string | null;
  totalCost?: number | string | null;
}): MealAnchorInput {
  const { headcount, totalCost } = parseMealNumbers(body.headcount, body.totalCost);
  return {
    restaurant: body.restaurant ?? null,
    foodNotes: body.foodNotes ?? null,
    interactionNotes: body.interactionNotes ?? null,
    headcount,
    totalCost,
  };
}

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
    doctorIds?: string[];
    facilityId?: string | null;
    anchorTime?: string | null;
    anchorType?: string;
    label?: string | null;
    patientName?: string | null;
    manualAddress?: string | null;
    orderId?: string | null;
    restaurant?: string | null;
    foodNotes?: string | null;
    interactionNotes?: string | null;
    headcount?: number | string | null;
    totalCost?: number | string | null;
  };

  if (!body.planDate) {
    return NextResponse.json(
      { error: "planDate is required" },
      { status: 400 },
    );
  }

  const anchorType = body.anchorType ?? "lunch";
  const meal = isMealAnchorType(anchorType) ? mealFromBody(body) : undefined;
  const doctorIds = Array.from(new Set((body.doctorIds ?? []).filter(Boolean)));
  const singleDoctorId = body.doctorId?.trim();
  const targets =
    doctorIds.length > 0
      ? doctorIds
      : singleDoctorId
        ? [singleDoctorId]
        : [];

  if (anchorType === "fitting") {
    if (targets.length === 0 && !body.manualAddress?.trim()) {
      return NextResponse.json(
        { error: "Pick a doctor or provide a manual fitting address" },
        { status: 400 },
      );
    }
  } else if (!body.facilityId || targets.length === 0) {
    return NextResponse.json(
      { error: "facilityId and at least one doctor are required" },
      { status: 400 },
    );
  }

  let sortOrder = 0;
  const { count } = await supabase
    .from("daily_plan_anchors")
    .select("id", { count: "exact", head: true })
    .eq("plan_date", body.planDate);
  sortOrder = count ?? 0;

  const inserts =
    targets.length > 0
      ? targets.map((doctorId, idx) =>
          buildAnchorInsertRow({
            planDate: body.planDate!,
            doctorId,
            facilityId: body.facilityId ?? null,
            anchorTime: body.anchorTime ?? null,
            anchorType,
            label: body.label ?? null,
            orderId: body.orderId ?? null,
            patientName: body.patientName,
            manualAddress: body.manualAddress,
            meal,
            sortOrder: sortOrder + idx,
          }),
        )
      : [
          buildAnchorInsertRow({
            planDate: body.planDate!,
            doctorId: null,
            facilityId: null,
            anchorTime: body.anchorTime ?? null,
            anchorType,
            label: body.label ?? null,
            orderId: body.orderId ?? null,
            patientName: body.patientName,
            manualAddress: body.manualAddress,
            meal,
            sortOrder,
          }),
        ];

  const { data, error } = await supabase
    .from("daily_plan_anchors")
    .insert(inserts as never)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (anchorType === "lunch" && targets.length > 0 && meal) {
    const lunchRow = lunchPayloadFromMeal({
      ...meal,
      planDate: body.planDate,
      facilityId: body.facilityId ?? null,
      anchorTime: body.anchorTime ?? null,
      label: body.label ?? null,
    });

    for (const doctorId of targets) {
      const { data: existingLunch } = await supabase
        .from("lunches")
        .select("id")
        .eq("doctor_id", doctorId)
        .eq("lunch_date", body.planDate)
        .neq("status", "cancelled")
        .maybeSingle();

      if (!existingLunch) {
        await supabase.from("lunches").insert({
          doctor_id: doctorId,
          ...lunchRow,
        });
      } else {
        await supabase.from("lunches").update(lunchRow).eq("id", existingLunch.id);
      }

      await supabase
        .from("doctors")
        .update({ lunch_date: body.planDate, lunch_scheduled: true })
        .eq("id", doctorId);
    }
  }

  return NextResponse.json({ ok: true, ids: (data ?? []).map((row) => row.id) });
}
