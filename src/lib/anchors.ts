import type { DayAnchorRow, DoctorRow, LunchRow } from "./types";

/** Lunch rows on this date become virtual anchors (shown in Day anchors panel). */
export function mergeLunchAnchors(
  dbAnchors: DayAnchorRow[],
  lunches: LunchRow[],
  doctors: DoctorRow[],
  planDate: string,
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
      anchor_time: "12:00:00",
      anchor_type: "lunch",
      label: "Lunch (from schedule)",
      sort_order: 50 + auto.length,
      is_auto: true,
      lunch_id: lunch.id,
      doctor_name: d?.name ?? null,
      facility_name: d?.facility_name ?? null,
      address: d?.address ?? null,
      zone: d?.zone ?? null,
    });
    anchoredDoctors.add(lunch.doctor_id);
  }

  return [...dbAnchors, ...auto];
}
