import { NextResponse } from "next/server";
import { buildAnchorInsertRow } from "@/lib/anchorDb";
import {
  isMealAnchorType,
  parseMealNumbers,
  type MealAnchorInput,
} from "@/lib/mealAnchor";
import { cancelLunchForDoctor, syncLunchForDoctor } from "@/lib/lunchSync";
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
    anchorType?: string;
    facilityId?: string | null;
    doctorIds?: string[];
    anchorIds?: string[];
    anchorTime?: string | null;
    label?: string | null;
    restaurant?: string | null;
    foodNotes?: string | null;
    interactionNotes?: string | null;
    headcount?: number | string | null;
    totalCost?: number | string | null;
  };

  if (!body.planDate || !body.anchorType) {
    return NextResponse.json(
      { error: "planDate and anchorType are required" },
      { status: 400 },
    );
  }

  if (!isMealAnchorType(body.anchorType)) {
    return NextResponse.json(
      { error: "Sync only applies to coffee, breakfast, and lunch anchors" },
      { status: 400 },
    );
  }

  const doctorIds = Array.from(new Set((body.doctorIds ?? []).filter(Boolean)));
  if (!body.facilityId || doctorIds.length === 0) {
    return NextResponse.json(
      { error: "facilityId and at least one doctor are required" },
      { status: 400 },
    );
  }

  const anchorIds = body.anchorIds ?? [];
  const { headcount, totalCost } = parseMealNumbers(body.headcount, body.totalCost);
  const meal: MealAnchorInput = {
    restaurant: body.restaurant ?? null,
    foodNotes: body.foodNotes ?? null,
    interactionNotes: body.interactionNotes ?? null,
    headcount,
    totalCost,
  };

  const sharedUpdate: Record<string, string | number | null> = {
    plan_date: body.planDate,
    facility_id: body.facilityId,
    anchor_type: body.anchorType,
    anchor_time: body.anchorTime ? `${body.anchorTime}:00` : null,
    label: body.label?.trim() || null,
    restaurant: body.restaurant?.trim() || null,
    food_notes: body.foodNotes?.trim() || null,
    interaction_notes: body.interactionNotes?.trim() || null,
    headcount,
    total_cost: totalCost,
    cost_per_head:
      totalCost != null && headcount != null && headcount > 0
        ? Math.round((totalCost / headcount) * 100) / 100
        : null,
  };

  let existingRows: Array<{ id: string; doctor_id: string | null }> = [];
  if (anchorIds.length > 0) {
    const { data, error } = await supabase
      .from("daily_plan_anchors")
      .select("id, doctor_id")
      .in("id", anchorIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    existingRows = data ?? [];
  }

  const existingDoctorIds = existingRows
    .map((r) => r.doctor_id)
    .filter((id): id is string => Boolean(id));

  const toRemove = existingRows.filter(
    (r) => r.doctor_id && !doctorIds.includes(r.doctor_id),
  );
  const toAdd = doctorIds.filter((id) => !existingDoctorIds.includes(id));
  const toKeep = doctorIds.filter((id) => existingDoctorIds.includes(id));

  for (const row of toRemove) {
    await supabase.from("daily_plan_anchors").delete().eq("id", row.id);
    if (body.anchorType === "lunch" && row.doctor_id) {
      await cancelLunchForDoctor(supabase, row.doctor_id, body.planDate);
    }
  }

  for (const row of existingRows) {
    if (!row.doctor_id || !toKeep.includes(row.doctor_id)) continue;
    await supabase
      .from("daily_plan_anchors")
      .update({ ...sharedUpdate, doctor_id: row.doctor_id })
      .eq("id", row.id);
  }

  if (toAdd.length > 0) {
    const { count } = await supabase
      .from("daily_plan_anchors")
      .select("id", { count: "exact", head: true })
      .eq("plan_date", body.planDate);
    let sortOrder = count ?? 0;

    const inserts = toAdd.map((doctorId, idx) =>
      buildAnchorInsertRow({
        planDate: body.planDate!,
        doctorId,
        facilityId: body.facilityId ?? null,
        anchorTime: body.anchorTime ?? null,
        anchorType: body.anchorType!,
        label: body.label ?? null,
        meal,
        sortOrder: sortOrder + idx,
      }),
    );

    const { error: insertErr } = await supabase
      .from("daily_plan_anchors")
      .insert(inserts as never);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  if (body.anchorType === "lunch") {
    for (const doctorId of doctorIds) {
      await syncLunchForDoctor(supabase, doctorId, body.planDate, body.facilityId ?? null, {
        ...meal,
        anchorTime: body.anchorTime ?? null,
        label: body.label ?? null,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
