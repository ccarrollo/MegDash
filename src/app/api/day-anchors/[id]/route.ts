import { NextResponse } from "next/server";
import { computeCostPerHead, isMealAnchorType, parseMealNumbers } from "@/lib/mealAnchor";
import { clearLunchFromPlan } from "@/lib/lunchSync";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

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
    restaurant?: string | null;
    foodNotes?: string | null;
    interactionNotes?: string | null;
    headcount?: number | string | null;
    totalCost?: number | string | null;
    label?: string | null;
    anchorTime?: string | null;
    patientName?: string | null;
    manualAddress?: string | null;
    doctorId?: string | null;
    facilityId?: string | null;
  };

  const { data: anchor, error: fetchErr } = await supabase
    .from("daily_plan_anchors")
    .select(
      "id, plan_date, doctor_id, facility_id, anchor_type, anchor_time, label",
    )
    .eq("id", id)
    .single();

  if (fetchErr || !anchor) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }

  const isMeal = isMealAnchorType(anchor.anchor_type);
  const isFitting = anchor.anchor_type === "fitting";
  const { headcount, totalCost } = parseMealNumbers(body.headcount, body.totalCost);
  const payload: Record<string, string | number | null> = {};

  if ("label" in body) payload.label = body.label?.trim() || null;
  if ("anchorTime" in body) {
    payload.anchor_time = body.anchorTime ? `${body.anchorTime}:00` : null;
  }
  if ("doctorId" in body) payload.doctor_id = body.doctorId ?? null;
  if ("facilityId" in body) payload.facility_id = body.facilityId ?? null;

  if (isMeal) {
    if ("restaurant" in body) payload.restaurant = body.restaurant?.trim() || null;
    if ("foodNotes" in body) payload.food_notes = body.foodNotes?.trim() || null;
    if ("interactionNotes" in body) {
      payload.interaction_notes = body.interactionNotes?.trim() || null;
    }
    if ("headcount" in body) payload.headcount = headcount;
    if ("totalCost" in body) {
      payload.total_cost = totalCost;
      payload.cost_per_head = computeCostPerHead(totalCost, headcount);
    } else if ("headcount" in body && headcount != null) {
      const { data: row } = await supabase
        .from("daily_plan_anchors")
        .select("total_cost")
        .eq("id", id)
        .single();
      const existingTotal = row?.total_cost as number | null;
      payload.cost_per_head = computeCostPerHead(existingTotal, headcount);
    }
  }

  if (isFitting) {
    if ("patientName" in body) {
      payload.patient_name = body.patientName?.trim() || null;
    }
    if ("manualAddress" in body) {
      payload.manual_address = body.manualAddress?.trim() || null;
    }
  }

  const { error } = await supabase
    .from("daily_plan_anchors")
    .update(payload)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (anchor.anchor_type === "lunch" && anchor.doctor_id) {
    const planDate = String(anchor.plan_date).slice(0, 10);
    const lunchPatch: Record<string, string | number | null> = {};

    if ("restaurant" in body) {
      const r = body.restaurant?.trim() || null;
      lunchPatch.restaurant = r;
      lunchPatch.lunch_order = r;
    }
    if ("foodNotes" in body) {
      lunchPatch.food_notes = body.foodNotes?.trim() || null;
    }
    if ("interactionNotes" in body) {
      lunchPatch.interaction_notes = body.interactionNotes?.trim() || null;
    }
    if ("headcount" in body) lunchPatch.headcount = headcount;
    if ("totalCost" in body) {
      lunchPatch.total_cost = totalCost;
      const heads = "headcount" in body ? headcount : undefined;
      if (totalCost != null && heads != null && heads > 0) {
        lunchPatch.cost_per_head = computeCostPerHead(totalCost, heads);
      } else if (totalCost == null) {
        lunchPatch.cost_per_head = null;
      }
    } else if ("headcount" in body && headcount != null) {
      const { data: row } = await supabase
        .from("lunches")
        .select("total_cost")
        .eq("doctor_id", anchor.doctor_id)
        .eq("lunch_date", planDate)
        .neq("status", "cancelled")
        .maybeSingle();
      const existingTotal = row?.total_cost as number | null;
      if (existingTotal != null && headcount > 0) {
        lunchPatch.cost_per_head = computeCostPerHead(existingTotal, headcount);
      }
    }
    if ("anchorTime" in body && body.anchorTime) {
      lunchPatch.start_time = `${body.anchorTime}:00`;
    }

    const { data: existingLunch } = await supabase
      .from("lunches")
      .select("id")
      .eq("doctor_id", anchor.doctor_id)
      .eq("lunch_date", planDate)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existingLunch?.id) {
      await supabase.from("lunches").update(lunchPatch).eq("id", existingLunch.id);
    } else if (Object.keys(lunchPatch).length > 0) {
      await supabase.from("lunches").insert({
        doctor_id: anchor.doctor_id,
        lunch_date: planDate,
        status: "scheduled",
        ...lunchPatch,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: Params) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;

  const { data: anchor, error: fetchErr } = await supabase
    .from("daily_plan_anchors")
    .select("id, plan_date, doctor_id, anchor_type")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (anchor?.anchor_type === "lunch" && anchor.doctor_id) {
    const planDate = String(anchor.plan_date).slice(0, 10);
    await clearLunchFromPlan(supabase, anchor.doctor_id, planDate);
  }

  const { error } = await supabase
    .from("daily_plan_anchors")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
