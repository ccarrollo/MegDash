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
  const body = (await request.json()) as { officeVibe?: string | null };

  const payload: Record<string, string | null> = {};
  if ("officeVibe" in body) payload.office_vibe = body.officeVibe ?? null;

  const { error } = await supabase.from("facilities").update(payload).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
