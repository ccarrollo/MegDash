import { getSupabase } from "./supabase";
import type { CoffeeDoctorMonth, CoffeeDeliveryRow, CoffeeMonthGoalRow, CoffeeRosterRow, DoctorRow } from "./types";

function logQueryError(label: string, error: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  const detail =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : String(error);
  console.warn(`[meg-field] ${label}:`, detail || "(no message)");
}

export function monthDateRange(year: number, month: number) {
  const m = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${m}-01`,
    end: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function isCurrentCalendarMonth(year: number, month: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month;
}

export async function fetchCoffeeMonth(
  year: number,
  month: number,
  doctors: DoctorRow[],
): Promise<CoffeeDoctorMonth[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { start, end } = monthDateRange(year, month);
  const doctorMap = new Map(doctors.map((d) => [d.id, d]));
  const viewingCurrent = isCurrentCalendarMonth(year, month);

  const [rosterRes, deliveriesRes, goalsRes] = await Promise.all([
    supabase.from("coffee_roster").select("*").order("created_at"),
    supabase
      .from("coffee_deliveries")
      .select("*")
      .gte("delivered_on", start)
      .lte("delivered_on", end)
      .order("delivered_on", { ascending: false }),
    supabase
      .from("coffee_month_goals")
      .select("*")
      .eq("period_year", year)
      .eq("period_month", month),
  ]);

  if (rosterRes.error) logQueryError("fetchCoffeeMonth.roster", rosterRes.error);
  if (deliveriesRes.error) {
    logQueryError("fetchCoffeeMonth.deliveries", deliveriesRes.error);
  }
  if (goalsRes.error) logQueryError("fetchCoffeeMonth.goals", goalsRes.error);

  const roster = (rosterRes.data ?? []) as CoffeeRosterRow[];
  const deliveries = (deliveriesRes.data ?? []) as CoffeeDeliveryRow[];
  const monthGoals = (goalsRes.data ?? []) as CoffeeMonthGoalRow[];

  const rosterByDoctor = new Map(roster.map((r) => [r.doctor_id, r]));
  const goalByDoctor = new Map(monthGoals.map((g) => [g.doctor_id, g.goal]));
  const deliveriesByDoctor = new Map<string, CoffeeDeliveryRow[]>();

  for (const d of deliveries) {
    const list = deliveriesByDoctor.get(d.doctor_id) ?? [];
    list.push(d);
    deliveriesByDoctor.set(d.doctor_id, list);
  }

  const doctorIds = new Set<string>();
  for (const r of roster) doctorIds.add(r.doctor_id);
  for (const d of deliveries) doctorIds.add(d.doctor_id);
  for (const g of monthGoals) doctorIds.add(g.doctor_id);

  if (!viewingCurrent) {
    for (const id of [...doctorIds]) {
      const onRoster = rosterByDoctor.has(id);
      const hasDeliveries = (deliveriesByDoctor.get(id)?.length ?? 0) > 0;
      const hasGoal = goalByDoctor.has(id);
      if (onRoster && !hasDeliveries && !hasGoal) {
        doctorIds.delete(id);
      }
    }
  }

  const entries: CoffeeDoctorMonth[] = [];

  for (const doctorId of doctorIds) {
    const doc = doctorMap.get(doctorId);
    if (!doc) continue;

    const rosterRow = rosterByDoctor.get(doctorId);
    const doctorDeliveries = deliveriesByDoctor.get(doctorId) ?? [];
    const defaultGoal = rosterRow?.monthly_goal ?? 1;
    const monthGoal = goalByDoctor.get(doctorId) ?? defaultGoal;

    entries.push({
      rosterId: rosterRow?.id ?? null,
      doctorId,
      doctorName: doc.name,
      facilityName: doc.facility_name ?? "",
      rosterNotes: rosterRow?.notes ?? null,
      defaultGoal,
      monthGoal,
      actual: doctorDeliveries.length,
      deliveries: doctorDeliveries.map((d) => ({
        id: d.id,
        deliveredOn: d.delivered_on,
        notes: d.notes,
      })),
      onRoster: Boolean(rosterRow),
    });
  }

  entries.sort((a, b) => {
    const aBehind = a.actual < a.monthGoal ? 0 : 1;
    const bBehind = b.actual < b.monthGoal ? 0 : 1;
    if (aBehind !== bBehind) return aBehind - bBehind;
    return a.doctorName.localeCompare(b.doctorName);
  });

  return entries;
}

export async function ensureCoffeeMonthGoal(
  doctorId: string,
  year: number,
  month: number,
  goal: number,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("coffee_month_goals").upsert(
    {
      doctor_id: doctorId,
      period_year: year,
      period_month: month,
      goal,
    },
    { onConflict: "doctor_id,period_year,period_month" },
  );

  if (error) logQueryError("ensureCoffeeMonthGoal", error);
}
