import type { DayAnchorRow, DoctorRow, LunchRow } from "./types";

export type FittingEvent = {
  id: string;
  doctor_id: string | null;
  facility_id: string | null;
  patient_label: string | null;
  fitting_address: string | null;
  fitted_at: string;
};

/** Lunch rows on this date become virtual anchors (shown in Day anchors panel). */
export function mergeLunchAnchors(
  dbAnchors: DayAnchorRow[],
  lunches: LunchRow[],
  fittings: FittingEvent[],
  doctors: DoctorRow[],
  planDate: string,
  excludedOrderIds: Set<string> = new Set(),
): DayAnchorRow[] {
  const anchoredDoctors = new Set(
    dbAnchors.map((a) => a.doctor_id).filter((id): id is string => Boolean(id)),
  );

  const auto: DayAnchorRow[] = [];
  for (const lunch of lunches) {
    if (!lunch.doctor_id || lunch.status === "cancelled") continue;
    if (anchoredDoctors.has(lunch.doctor_id)) continue;

    const d = doctors.find((doc) => doc.id === lunch.doctor_id);
    auto.push({
      id: `auto-lunch-${lunch.id}`,
      plan_date: planDate,
      doctor_id: lunch.doctor_id,
      facility_id: lunch.facility_id ?? d?.facility_id ?? null,
      anchor_time: lunch.start_time ?? "12:00:00",
      anchor_type: "lunch",
      label: lunch.restaurant ?? lunch.lunch_order ?? "Lunch (from schedule)",
      sort_order: 50 + auto.length,
      is_auto: true,
      lunch_id: lunch.id,
      restaurant: lunch.restaurant ?? lunch.lunch_order ?? null,
      food_notes: lunch.food_notes ?? null,
      interaction_notes: lunch.interaction_notes ?? null,
      headcount: lunch.headcount ?? null,
      total_cost: lunch.total_cost ?? null,
      cost_per_head: lunch.cost_per_head ?? null,
      doctor_name: d?.name ?? null,
      facility_name: d?.facility_name ?? null,
      address: d?.address ?? null,
      zone: d?.zone ?? null,
    });
    anchoredDoctors.add(lunch.doctor_id);
  }

  for (const fit of fittings) {
    if (excludedOrderIds.has(fit.id)) continue;
    const key = `auto-fit-${fit.id}`;
    if (dbAnchors.some((a) => a.order_id === fit.id || a.id === key)) continue;
    const d = fit.doctor_id
      ? doctors.find((doc) => doc.id === fit.doctor_id)
      : null;
    const when = new Date(fit.fitted_at);
    const hh = String(when.getHours()).padStart(2, "0");
    const mm = String(when.getMinutes()).padStart(2, "0");
    auto.push({
      id: key,
      plan_date: planDate,
      doctor_id: fit.doctor_id ?? null,
      facility_id: fit.facility_id ?? d?.facility_id ?? null,
      order_id: fit.id,
      anchor_time: `${hh}:${mm}:00`,
      anchor_type: "fitting",
      label: "Fitting (from order)",
      patient_name: fit.patient_label ?? null,
      manual_address: fit.fitting_address ?? null,
      sort_order: 100 + auto.length,
      is_auto: true,
      doctor_name: d?.name ?? null,
      facility_name: d?.facility_name ?? "Home fitting",
      address: fit.fitting_address ?? d?.address ?? "Address needed",
      zone: d?.zone ?? "unknown",
    });
  }

  return [...dbAnchors, ...auto];
}
