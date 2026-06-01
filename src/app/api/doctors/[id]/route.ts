import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = {
  params: Promise<{ id: string }>;
};

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
    status?: string;
    followUpDate?: string | null;
    follow_up_lunch?: string | null;
    front_desk_notes?: string | null;
    competitor_notes?: string | null;
    order_history?: string | null;
    followUpLunch?: string | null;
    frontDeskNotes?: string | null;
    competitorNotes?: string | null;
    orderHistory?: string | null;
    interaction_notes?: string | null;
    interactionNotes?: string | null;
    daily_queue_hidden?: boolean;
    dailyQueueHidden?: boolean;
  };

  const payload: Record<string, string | boolean | null> = {};
  if (typeof body.status === "string") payload.status = body.status.trim();
  if ("followUpDate" in body) payload.follow_up_date = body.followUpDate || null;
  if ("follow_up_lunch" in body) payload.follow_up_lunch = body.follow_up_lunch ?? null;
  if ("followUpLunch" in body) payload.follow_up_lunch = body.followUpLunch ?? null;
  if ("front_desk_notes" in body) payload.front_desk_notes = body.front_desk_notes ?? null;
  if ("frontDeskNotes" in body) payload.front_desk_notes = body.frontDeskNotes ?? null;
  if ("competitor_notes" in body) payload.competitor_notes = body.competitor_notes ?? null;
  if ("competitorNotes" in body) payload.competitor_notes = body.competitorNotes ?? null;
  if ("order_history" in body) payload.order_history = body.order_history ?? null;
  if ("orderHistory" in body) payload.order_history = body.orderHistory ?? null;
  if ("interaction_notes" in body) {
    payload.interaction_notes = body.interaction_notes ?? null;
  }
  if ("interactionNotes" in body) {
    payload.interaction_notes = body.interactionNotes ?? null;
  }
  if ("daily_queue_hidden" in body) {
    payload.daily_queue_hidden = Boolean(body.daily_queue_hidden);
  }
  if ("dailyQueueHidden" in body) {
    payload.daily_queue_hidden = Boolean(body.dailyQueueHidden);
  }

  const { error } = await supabase.from("doctors").update(payload).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
