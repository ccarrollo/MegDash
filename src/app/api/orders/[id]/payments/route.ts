import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Params) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    paymentYear?: number;
    paymentMonth?: number;
    amount?: number;
    paymentSource?: "insurance" | "patient";
    notes?: string | null;
  };

  if (!body.paymentYear || !body.paymentMonth) {
    return NextResponse.json(
      { error: "Payment year and month required" },
      { status: 400 },
    );
  }
  if (body.amount == null || !Number.isFinite(body.amount)) {
    return NextResponse.json(
      { error: "Amount is required (use 0 for comp/giveaway)" },
      { status: 400 },
    );
  }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const channel = (order.channel as string) ?? "3pp";
  const mySales = body.amount;
  const orderDate = order.ordered_at?.slice(0, 10) ?? null;
  const fittedDate = order.fitted_at?.slice(0, 10) ?? null;

  const { data, error } = await supabase
    .from("sales_records")
    .insert({
      order_id: id,
      doctor_id: order.doctor_id,
      facility_id: order.facility_id,
      patient_label: order.patient_label,
      order_date: orderDate,
      fitted_date: fittedDate,
      payment_year: body.paymentYear,
      payment_month: body.paymentMonth,
      revenue: mySales,
      my_sales_amount: mySales,
      channel,
      product: order.product,
      insurance: order.insurance,
      payment_source: body.paymentSource ?? null,
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
