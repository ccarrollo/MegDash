import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = {
  params: Promise<{ id: string }>;
};

function normalizeDate(value?: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

export async function PATCH(request: Request, ctx: Params) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as { manualLastVisitDate?: string | null };
  const dateValue = normalizeDate(body.manualLastVisitDate);

  const { error } = await supabase
    .from("doctors")
    .update({
      manual_last_visit_date: dateValue,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, manualLastVisitDate: dateValue });
}
