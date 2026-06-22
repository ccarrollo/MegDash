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
    paymentYear?: number;
    paymentMonth?: number;
    mySalesAmount?: number;
    product?: string | null;
    actualCost?: number | null;
    insurance?: string | null;
    affectedBone?: string | null;
    orderDate?: string | null;
    fittedDate?: string | null;
    notes?: string | null;
  };

  if (!body.paymentYear || !body.paymentMonth) {
    return NextResponse.json(
      { error: "Payment year and month required" },
      { status: 400 },
    );
  }

  if (body.mySalesAmount == null || !Number.isFinite(body.mySalesAmount)) {
    return NextResponse.json(
      { error: "My Sales $ is required (negative for refunds, 0 for comp)" },
      { status: 400 },
    );
  }

  let facilityId: string | null = null;
  if (body.doctorId) {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("facility_id")
      .eq("id", body.doctorId)
      .single();
    facilityId = doctor?.facility_id ?? null;
  }

  const mySales = body.mySalesAmount;

  const { data, error } = await supabase
    .from("sales_records")
    .insert({
      doctor_id: body.doctorId ?? null,
      facility_id: facilityId,
      patient_label: body.patientLabel?.trim() || null,
      payment_year: body.paymentYear,
      payment_month: body.paymentMonth,
      my_sales_amount: mySales,
      revenue: mySales,
      channel: "3pp",
      product: body.product?.trim() || null,
      actual_cost: body.actualCost ?? null,
      insurance: body.insurance?.trim() || null,
      affected_bone: body.affectedBone?.trim() || null,
      order_date: body.orderDate || null,
      fitted_date: body.fittedDate || null,
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
