import { NextResponse } from "next/server";
import { inferZone } from "@/lib/zones";
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
    name?: string;
    address?: string;
    city?: string;
    locationLabel?: string;
  };

  const name = body.name?.trim();
  const address = body.address?.trim();
  if (!name || !address) {
    return NextResponse.json(
      { error: "Facility name and address are required" },
      { status: 400 },
    );
  }

  const zone = inferZone(body.city, `${body.locationLabel ?? ""} ${address}`);

  const { data, error } = await supabase
    .from("facilities")
    .insert({
      name,
      address,
      city: body.city?.trim() || null,
      location_label: body.locationLabel?.trim() || null,
      zone,
    })
    .select("id,name,address")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, facility: data });
}
