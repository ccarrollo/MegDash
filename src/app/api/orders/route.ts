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
    doctorId?: string | null;
    patientLabel?: string | null;
    insurance?: string | null;
    orderedAt?: string | null;
    fittedAt?: string | null;
    channel?: string | null;
    product?: string | null;
    orderTotal?: number | null;
    insuranceExpected?: number | null;
    patientResponsibilityTotal?: number | null;
    notes?: string | null;
  };

  if (!body.doctorId) {
    return NextResponse.json({ error: "Prescriber is required" }, { status: 400 });
  }
  if (!body.patientLabel?.trim()) {
    return NextResponse.json({ error: "Patient name is required" }, { status: 400 });
  }

  const { data: doctor, error: doctorErr } = await supabase
    .from("doctors")
    .select("facility_id")
    .eq("id", body.doctorId)
    .single();

  if (doctorErr || !doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const orderedAt = body.orderedAt
    ? `${body.orderedAt}T12:00:00.000Z`
    : new Date().toISOString();

  const pipelineStage = body.fittedAt ? "fitted" : "open";

  const { data, error } = await supabase
    .from("orders")
    .insert({
      doctor_id: body.doctorId,
      facility_id: doctor.facility_id,
      patient_label: body.patientLabel.trim(),
      insurance: body.insurance?.trim() || null,
      ordered_at: orderedAt,
      fitted_at: body.fittedAt || null,
      channel: body.channel === "wholesale" ? "wholesale" : "3pp",
      product: body.product?.trim() || null,
      order_total: body.orderTotal ?? null,
      insurance_expected: body.insuranceExpected ?? null,
      patient_responsibility_total: body.patientResponsibilityTotal ?? null,
      pipeline_stage: pipelineStage,
      status: "pending",
      source: "sales",
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
