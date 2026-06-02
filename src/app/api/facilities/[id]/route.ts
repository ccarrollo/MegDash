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
    name?: string | null;
    address?: string | null;
    city?: string | null;
    locationLabel?: string | null;
    officeVibe?: string | null;
  };

  const payload: Record<string, string | null> = {};
  if ("name" in body) payload.name = body.name?.trim() || null;
  if ("address" in body) payload.address = body.address?.trim() || null;
  if ("city" in body) payload.city = body.city?.trim() || null;
  if ("locationLabel" in body) payload.location_label = body.locationLabel?.trim() || null;
  if ("officeVibe" in body) payload.office_vibe = body.officeVibe ?? null;

  if (payload.name === null && "name" in body) {
    return NextResponse.json({ error: "Facility name is required" }, { status: 400 });
  }

  const { error } = await supabase.from("facilities").update(payload).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
