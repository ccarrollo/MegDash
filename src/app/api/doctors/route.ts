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
    facilityId?: string;
    name?: string;
    primaryFocus?: string;
    status?: string;
    priority?: string;
    followUpDate?: string | null;
  };

  const facilityId = body.facilityId?.trim();
  const name = body.name?.trim();
  if (!facilityId || !name) {
    return NextResponse.json(
      { error: "Facility and doctor name are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("doctors")
    .insert({
      facility_id: facilityId,
      name,
      primary_focus: body.primaryFocus?.trim() || null,
      status: body.status?.trim() || "2. Introduced",
      priority: body.priority?.trim() || "Medium",
      follow_up_date: body.followUpDate || null,
    })
    .select("id,name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, doctor: data });
}
