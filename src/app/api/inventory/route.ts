import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function PUT(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    stimId?: string;
    quantity?: number;
  };

  if (!body.stimId || body.quantity == null || !Number.isFinite(body.quantity)) {
    return NextResponse.json(
      { error: "stimId and quantity are required" },
      { status: 400 },
    );
  }

  const quantity = Math.max(0, Math.floor(body.quantity));
  const { error } = await supabase.from("inventory_items").upsert(
    {
      stim_id: body.stimId,
      quantity,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stim_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stimId: body.stimId, quantity });
}
