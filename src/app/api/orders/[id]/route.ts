import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

const PIPELINE_STAGES = [
  "order_received",
  "insurance_review",
  "fitted",
  "paid",
  "lost",
] as const;

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
    product?: string | null;
    recordSale?: boolean;
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
  if ("patientLabel" in body) payload.patient_label = body.patientLabel ?? null;
  if ("fittedAt" in body) payload.fitted_at = body.fittedAt ?? null;
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
  if ("product" in body) payload.product = body.product ?? null;

  const stage = (body.pipelineStage ?? existing.pipeline_stage) as string;
  if (stage === "paid" || body.recordSale) {
    payload.counts_as_sale = true;
    payload.pipeline_stage = "paid";
  }
  if (stage === "lost") {
    payload.counts_as_sale = false;
  }

  const { error } = await supabase.from("orders").update(payload).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const shouldRecordSale =
    body.recordSale ||
    stage === "paid" ||
    (body.paymentYear && body.paymentMonth);

  if (
    shouldRecordSale &&
    body.paymentYear &&
    body.paymentMonth
  ) {
    const orderDate = existing.ordered_at?.slice(0, 10) ?? null;
    const fittedDate = body.fittedAt?.slice(0, 10) ?? existing.fitted_at?.slice(0, 10) ?? null;

    const mySales =
      body.mySalesAmount ??
      body.amount ??
      existing.my_sales_amount ??
      existing.amount;
    await supabase.from("sales_records").upsert(
      {
        order_id: id,
        doctor_id: existing.doctor_id,
        facility_id: existing.facility_id,
        patient_label: body.patientLabel ?? existing.patient_label,
        order_date: orderDate,
        fitted_date: fittedDate,
        payment_year: body.paymentYear,
        payment_month: body.paymentMonth,
        revenue: mySales ?? null,
        my_sales_amount: mySales ?? 0,
        channel: "3pp",
        actual_cost: body.actualCost ?? existing.actual_cost ?? null,
        insurance: body.insurance ?? existing.insurance ?? null,
        affected_bone: body.affectedBone ?? existing.affected_bone ?? null,
        product: body.product ?? existing.product,
        notes: body.notes ?? existing.notes,
      },
      { onConflict: "order_id", ignoreDuplicates: false },
    );
  }

  return NextResponse.json({ ok: true });
}
