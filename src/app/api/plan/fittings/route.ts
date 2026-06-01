import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function DELETE(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    planDate?: string;
    orderId?: string;
    anchorId?: string;
  };

  if (!body.planDate) {
    return NextResponse.json({ error: "planDate required" }, { status: 400 });
  }

  let orderId = body.orderId;
  if (!orderId && body.anchorId?.startsWith("auto-fit-")) {
    orderId = body.anchorId.slice("auto-fit-".length);
  }

  if (body.anchorId && !body.anchorId.startsWith("auto-fit-")) {
    const { error } = await supabase
      .from("daily_plan_anchors")
      .delete()
      .eq("id", body.anchorId)
      .eq("plan_date", body.planDate);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (orderId) {
    await supabase
      .from("daily_plan_anchors")
      .delete()
      .eq("plan_date", body.planDate)
      .eq("order_id", orderId);

    const { error: exclErr } = await supabase.from("plan_fitting_exclusions").upsert(
      {
        plan_date: body.planDate,
        order_id: orderId,
      },
      { onConflict: "plan_date,order_id" },
    );
    if (exclErr) {
      return NextResponse.json({ error: exclErr.message }, { status: 500 });
    }
  } else if (!body.anchorId) {
    return NextResponse.json(
      { error: "orderId or anchorId required" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
