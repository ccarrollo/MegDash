import { NextResponse } from "next/server";
import { clearLunchFromPlan } from "@/lib/lunchSync";
import { getSupabase } from "@/lib/supabase";

/** Remove a lunch stop from the day plan (cancels lunch row + anchors + doctor flags). */
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
    doctorId?: string;
    lunchId?: string;
  };

  if (!body.planDate) {
    return NextResponse.json({ error: "planDate required" }, { status: 400 });
  }

  let doctorId = body.doctorId;
  if (!doctorId && body.lunchId) {
    const { data: lunch } = await supabase
      .from("lunches")
      .select("doctor_id")
      .eq("id", body.lunchId)
      .maybeSingle();
    doctorId = lunch?.doctor_id as string | undefined;
  }

  if (!doctorId) {
    return NextResponse.json(
      { error: "doctorId or lunchId required" },
      { status: 400 },
    );
  }

  await clearLunchFromPlan(supabase, doctorId, body.planDate);

  return NextResponse.json({ ok: true });
}
