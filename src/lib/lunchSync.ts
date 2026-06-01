import { lunchPayloadFromMeal, type MealAnchorInput } from "./mealAnchor";
import type { getSupabase } from "./supabase";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabase>>;

export async function syncLunchForDoctor(
  supabase: SupabaseClient,
  doctorId: string,
  planDate: string,
  facilityId: string | null,
  meal: MealAnchorInput & {
    anchorTime?: string | null;
    label?: string | null;
  },
) {
  const lunchRow = lunchPayloadFromMeal({
    ...meal,
    planDate,
    facilityId,
    anchorTime: meal.anchorTime,
    label: meal.label,
  });

  const { data: existingLunch } = await supabase
    .from("lunches")
    .select("id")
    .eq("doctor_id", doctorId)
    .eq("lunch_date", planDate)
    .neq("status", "cancelled")
    .maybeSingle();

  if (!existingLunch) {
    await supabase.from("lunches").insert({
      doctor_id: doctorId,
      ...lunchRow,
    });
  } else {
    await supabase.from("lunches").update(lunchRow).eq("id", existingLunch.id);
  }

  await supabase
    .from("doctors")
    .update({ lunch_date: planDate, lunch_scheduled: true })
    .eq("id", doctorId);
}

/** Cancel lunch schedule rows so the day plan stops showing this stop. */
export async function cancelLunchForDoctor(
  supabase: SupabaseClient,
  doctorId: string,
  planDate: string,
) {
  const { data: lunch } = await supabase
    .from("lunches")
    .select("id")
    .eq("doctor_id", doctorId)
    .eq("lunch_date", planDate)
    .neq("status", "cancelled")
    .maybeSingle();

  if (lunch?.id) {
    await supabase
      .from("lunches")
      .update({ status: "cancelled" })
      .eq("id", lunch.id);
  }

  await supabase
    .from("doctors")
    .update({ lunch_scheduled: false, lunch_date: null })
    .eq("id", doctorId);
}

/** Remove lunch from the day plan: cancel schedule row, clear doctor flags, drop lunch anchors. */
export async function clearLunchFromPlan(
  supabase: SupabaseClient,
  doctorId: string,
  planDate: string,
) {
  await cancelLunchForDoctor(supabase, doctorId, planDate);
  await supabase
    .from("daily_plan_anchors")
    .delete()
    .eq("plan_date", planDate)
    .eq("doctor_id", doctorId)
    .eq("anchor_type", "lunch");
}
