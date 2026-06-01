import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Params) {
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
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      doctor_id: existing.doctor_id,
      facility_id: existing.facility_id,
      patient_label: existing.patient_label,
      insurance: existing.insurance,
      ordered_at: new Date().toISOString(),
      fitted_at: null,
      channel: existing.channel ?? "3pp",
      product: existing.product,
      order_total: existing.order_total,
      insurance_expected: existing.insurance_expected,
      patient_responsibility_total: existing.patient_responsibility_total,
      pipeline_stage: "open",
      status: "pending",
      source: "copy",
      notes: existing.notes
        ? `Copied from order · ${existing.notes}`
        : "Copied from previous order",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
