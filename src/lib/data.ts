import { buildDailyPlan } from "./planner";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { DoctorRow } from "./types";

export async function fetchDoctors(): Promise<DoctorRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("doctors_with_last_visit")
    .select("*")
    .order("priority", { ascending: true });

  if (error) {
    console.error("fetchDoctors", error);
    return [];
  }

  return (data ?? []) as DoctorRow[];
}

export async function getTodayPlan() {
  const doctors = await fetchDoctors();
  return buildDailyPlan(doctors);
}

export function getSetupStatus() {
  return {
    supabase: isSupabaseConfigured(),
  };
}
