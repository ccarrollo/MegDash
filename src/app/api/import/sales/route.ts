import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { mapSalesRows, parseCsv } from "@/lib/importSalesGoals";

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    csv?: string;
    periodYear?: number;
    replaceExisting?: boolean;
  };

  if (!body.csv?.trim()) {
    return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
  }

  const defaultYear = body.periodYear ?? new Date().getFullYear();
  const rows = mapSalesRows(parseCsv(body.csv), defaultYear);

  if (!rows.length) {
    return NextResponse.json(
      {
        error:
          "No paid 3PP sales found. Export the Sales tab as CSV (Status = Paid, My Sales $).",
      },
      { status: 400 },
    );
  }

  if (body.replaceExisting) {
    await supabase
      .from("sales_records")
      .delete()
      .eq("payment_year", defaultYear);
  }

  const { data: doctors } = await supabase.from("doctors").select("id, name");
  const doctorByName = new Map(
    (doctors ?? []).map((d) => [d.name.toLowerCase().trim(), d.id]),
  );

  let inserted = 0;
  let unmatchedDoctors = 0;

  for (const row of rows) {
    let doctorId: string | null = null;
    if (row.doctorName) {
      doctorId = doctorByName.get(row.doctorName.toLowerCase()) ?? null;
      if (!doctorId) unmatchedDoctors += 1;
    }

    const { error } = await supabase.from("sales_records").insert({
      doctor_id: doctorId,
      patient_label: row.patientLabel,
      payment_year: row.paymentYear,
      payment_month: row.paymentMonth,
      my_sales_amount: row.mySalesAmount,
      revenue: row.mySalesAmount,
      channel: "3pp",
      product: row.product,
      actual_cost: row.actualCost,
      insurance: row.insurance,
      affected_bone: row.affectedBone,
      order_date: row.orderDate,
      fitted_date: row.fittedDate,
      notes: row.notes,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    inserted += 1;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skipped: 0,
    unmatchedDoctors,
    defaultYear,
  });
}
