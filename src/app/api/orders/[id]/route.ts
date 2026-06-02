import { NextResponse } from "next/server";
import { buildAnchorInsertRow } from "@/lib/anchorDb";
import { DEVICE_MODEL_OPTIONS } from "@/lib/constants";
import { buildFittingAnchorLabel } from "@/lib/fittingAnchor";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

const PIPELINE_STAGES = [
  "order_received",
  "insurance_review",
  "fitted",
  "paid",
  "lost",
] as const;

function normalizeInventoryStimId(product: string | null | undefined): string | null {
  const raw = (product ?? "").trim();
  if (!raw) return null;
  const exact = DEVICE_MODEL_OPTIONS.find(
    (option) => option.toLowerCase() === raw.toLowerCase(),
  );
  return exact ?? null;
}

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
    status?: string;
    pipelineStage?: string;
    orderedAt?: string | null;
    insuranceReviewedAt?: string | null;
    patientLabel?: string | null;
    fittedAt?: string | null;
    paymentYear?: number | null;
    paymentMonth?: number | null;
    insuranceNotes?: string | null;
    notes?: string | null;
    amount?: number | null;
    mySalesAmount?: number | null;
    actualCost?: number | null;
    channel?: string | null;
    insurance?: string | null;
    affectedBone?: string | null;
    fittingAddress?: string | null;
    product?: string | null;
    deviceModel?: string | null;
    orderTotal?: number | null;
    insuranceExpected?: number | null;
    patientResponsibilityTotal?: number | null;
    doctorId?: string | null;
  };

  const { data: existing, error: fetchErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const payload: Record<string, string | number | boolean | null> = {};
  if (typeof body.status === "string") payload.status = body.status;
  if (typeof body.pipelineStage === "string") {
    payload.pipeline_stage = body.pipelineStage;
  }
  if ("orderedAt" in body) {
    payload.ordered_at = body.orderedAt
      ? `${body.orderedAt}T12:00:00.000Z`
      : null;
  }
  if ("insuranceReviewedAt" in body) {
    payload.insurance_reviewed_at = body.insuranceReviewedAt
      ? `${body.insuranceReviewedAt}T12:00:00.000Z`
      : null;
  }
  if ("patientLabel" in body) payload.patient_label = body.patientLabel ?? null;
  if ("fittedAt" in body) payload.fitted_at = body.fittedAt ?? null;
  if ("doctorId" in body && body.doctorId) {
    payload.doctor_id = body.doctorId;
    const { data: doc } = await supabase
      .from("doctors")
      .select("facility_id")
      .eq("id", body.doctorId)
      .maybeSingle();
    if (doc?.facility_id) payload.facility_id = doc.facility_id;
  }
  if ("paymentYear" in body) payload.payment_year = body.paymentYear ?? null;
  if ("paymentMonth" in body) payload.payment_month = body.paymentMonth ?? null;
  if ("insuranceNotes" in body) {
    payload.insurance_notes = body.insuranceNotes ?? null;
  }
  if ("notes" in body) payload.notes = body.notes ?? null;
  if ("amount" in body) payload.amount = body.amount ?? null;
  if ("mySalesAmount" in body) {
    payload.my_sales_amount = body.mySalesAmount ?? null;
  }
  if ("actualCost" in body) payload.actual_cost = body.actualCost ?? null;
  if ("channel" in body) payload.channel = body.channel ?? "3pp";
  if ("insurance" in body) payload.insurance = body.insurance ?? null;
  if ("affectedBone" in body) payload.affected_bone = body.affectedBone ?? null;
  if ("fittingAddress" in body) {
    payload.fitting_address = body.fittingAddress ?? null;
  }
  if ("product" in body) payload.product = body.product ?? null;
  if ("orderTotal" in body) payload.order_total = body.orderTotal ?? null;
  if ("insuranceExpected" in body) {
    payload.insurance_expected = body.insuranceExpected ?? null;
  }
  if ("patientResponsibilityTotal" in body) {
    payload.patient_responsibility_total = body.patientResponsibilityTotal ?? null;
  }

  if ("fittedAt" in body && body.fittedAt) {
    const stage = (body.pipelineStage ?? existing.pipeline_stage) as string;
    if (stage !== "lost" && stage !== "paid" && stage !== "closed") {
      payload.pipeline_stage = "fitted";
    }
  }

  const stage = (body.pipelineStage ?? existing.pipeline_stage) as string;
  if (stage === "lost") {
    payload.counts_as_sale = false;
  }

  const { error } = await supabase.from("orders").update(payload).eq("id", id);
  if ("fittedAt" in body && body.fittedAt) {
    const fittedDate = body.fittedAt.slice(0, 10);
    const fittedTime = body.fittedAt.includes("T")
      ? body.fittedAt.split("T")[1].slice(0, 5)
      : "12:00";
    const { data: existingAnchor } = await supabase
      .from("daily_plan_anchors")
      .select("id")
      .eq("order_id", id)
      .maybeSingle();
    const fittingLabel = buildFittingAnchorLabel({
      label: "Fitting (from order)",
      patientName: body.patientLabel ?? existing.patient_label ?? null,
      manualAddress: body.fittingAddress ?? existing.fitting_address ?? null,
    });
    if (existingAnchor?.id) {
      await supabase
        .from("daily_plan_anchors")
        .update({
          plan_date: fittedDate,
          anchor_time: `${fittedTime}:00`,
          doctor_id: existing.doctor_id,
          facility_id: existing.facility_id,
          anchor_type: "fitting",
          label: fittingLabel,
        })
        .eq("id", existingAnchor.id);
    } else {
      const { count } = await supabase
        .from("daily_plan_anchors")
        .select("id", { count: "exact", head: true })
        .eq("plan_date", fittedDate);
      await supabase.from("daily_plan_anchors").insert(
        buildAnchorInsertRow({
          planDate: fittedDate,
          doctorId: existing.doctor_id,
          facilityId: existing.facility_id,
          anchorTime: `${fittedTime}:00`,
          anchorType: "fitting",
          label: "Fitting (from order)",
          patientName: body.patientLabel ?? existing.patient_label ?? null,
          manualAddress: body.fittingAddress ?? existing.fitting_address ?? null,
          sortOrder: count ?? 0,
        }) as never,
      );
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nextFittedAt = body.fittedAt ?? existing.fitted_at;
  const inventoryDeductedAt = (existing.inventory_deducted_at as string | null) ?? null;
  if (nextFittedAt && !inventoryDeductedAt) {
    const stimId = normalizeInventoryStimId(
      body.deviceModel ?? body.product ?? existing.product,
    );
    if (stimId) {
      const { data: inventoryRow, error: inventoryReadErr } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("stim_id", stimId)
        .maybeSingle();
      if (inventoryReadErr) {
        return NextResponse.json({ error: inventoryReadErr.message }, { status: 500 });
      }

      const currentQty =
        inventoryRow && typeof inventoryRow.quantity === "number"
          ? inventoryRow.quantity
          : 0;
      const nextQty = Math.max(0, currentQty - 1);
      const { error: inventoryWriteErr } = await supabase
        .from("inventory_items")
        .upsert(
          {
            stim_id: stimId,
            quantity: nextQty,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stim_id" },
        );
      if (inventoryWriteErr) {
        return NextResponse.json({ error: inventoryWriteErr.message }, { status: 500 });
      }

      const { error: markDeductedErr } = await supabase
        .from("orders")
        .update({ inventory_deducted_at: new Date().toISOString() })
        .eq("id", id);
      if (markDeductedErr) {
        return NextResponse.json({ error: markDeductedErr.message }, { status: 500 });
      }
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

  const { data: existing, error: fetchErr } = await supabase
    .from("orders")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { error: paymentsErr } = await supabase
    .from("sales_records")
    .delete()
    .eq("order_id", id);
  if (paymentsErr) {
    return NextResponse.json({ error: paymentsErr.message }, { status: 500 });
  }

  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
