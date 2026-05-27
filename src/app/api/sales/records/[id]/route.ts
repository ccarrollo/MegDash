import { NextResponse } from "next/server";
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
    doctorId?: string | null;
    patientLabel?: string | null;
    paymentYear?: number;
    paymentMonth?: number;
    mySalesAmount?: number;
    product?: string | null;
    actualCost?: number | null;
    insurance?: string | null;
    affectedBone?: string | null;
    notes?: string | null;
  };

  const { data: existing, error: fetchErr } = await supabase
    .from("sales_records")
    .select("id, order_id, doctor_id, facility_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  if (body.paymentYear != null && body.paymentMonth != null) {
    if (body.paymentMonth < 1 || body.paymentMonth > 12) {
      return NextResponse.json(
        { error: "Payment month must be 1–12" },
        { status: 400 },
      );
    }
  }

  if (
    body.mySalesAmount != null &&
    !Number.isFinite(body.mySalesAmount)
  ) {
    return NextResponse.json(
      { error: "My Sales $ must be a number (use 0 for comp/giveaway)" },
      { status: 400 },
    );
  }

  const payload: Record<string, string | number | null> = {};

  if ("doctorId" in body) {
    payload.doctor_id = body.doctorId ?? null;
    if (body.doctorId) {
      const { data: doctor } = await supabase
        .from("doctors")
        .select("facility_id")
        .eq("id", body.doctorId)
        .single();
      payload.facility_id = doctor?.facility_id ?? null;
    } else {
      payload.facility_id = null;
    }
  }

  if ("patientLabel" in body) {
    payload.patient_label = body.patientLabel?.trim() || null;
  }
  if (body.paymentYear != null) payload.payment_year = body.paymentYear;
  if (body.paymentMonth != null) payload.payment_month = body.paymentMonth;
  if (body.mySalesAmount != null) {
    payload.my_sales_amount = body.mySalesAmount;
    payload.revenue = body.mySalesAmount;
  }
  if ("product" in body) payload.product = body.product?.trim() || null;
  if ("actualCost" in body) payload.actual_cost = body.actualCost ?? null;
  if ("insurance" in body) {
    payload.insurance = body.insurance?.trim() || null;
  }
  if ("affectedBone" in body) {
    payload.affected_bone = body.affectedBone?.trim() || null;
  }
  if ("notes" in body) payload.notes = body.notes?.trim() || null;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("sales_records")
    .update(payload)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing.order_id) {
    const orderPatch: Record<string, string | number | boolean | null> = {};
    if ("patientLabel" in body) {
      orderPatch.patient_label = body.patientLabel?.trim() || null;
    }
    if (body.paymentYear != null) orderPatch.payment_year = body.paymentYear;
    if (body.paymentMonth != null) orderPatch.payment_month = body.paymentMonth;
    if (body.mySalesAmount != null) {
      orderPatch.my_sales_amount = body.mySalesAmount;
      orderPatch.amount = body.mySalesAmount;
    }
    if ("product" in body) orderPatch.product = body.product?.trim() || null;
    if ("actualCost" in body) {
      orderPatch.actual_cost = body.actualCost ?? null;
    }
    if ("insurance" in body) {
      orderPatch.insurance = body.insurance?.trim() || null;
    }
    if ("affectedBone" in body) {
      orderPatch.affected_bone = body.affectedBone?.trim() || null;
    }
    if ("notes" in body) orderPatch.notes = body.notes?.trim() || null;
    if ("doctorId" in body) orderPatch.doctor_id = body.doctorId ?? null;

    if (Object.keys(orderPatch).length > 0) {
      await supabase.from("orders").update(orderPatch).eq("id", existing.order_id);
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
    .from("sales_records")
    .select("id, order_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const { error } = await supabase.from("sales_records").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing.order_id) {
    await supabase
      .from("orders")
      .update({ counts_as_sale: false })
      .eq("id", existing.order_id);
  }

  return NextResponse.json({ ok: true });
}
