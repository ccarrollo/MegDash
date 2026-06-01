import type { DayAnchorRow, DoctorRow, LunchWithDoctor } from "./types";

export type AnchorHistoryItem = {
  key: string;
  planDate: string;
  anchorType: string;
  anchorTime: string | null;
  doctorId: string | null;
  doctorName: string | null;
  facilityName: string | null;
  label: string | null;
  restaurant: string | null;
  foodNotes: string | null;
  anchorDbId: string | null;
  lunchId: string | null;
  /** True when the row comes from the legacy lunches table. */
  fromLunchSchedule: boolean;
};

function historyKey(
  planDate: string,
  doctorId: string | null,
  anchorType: string,
) {
  return `${planDate}:${doctorId ?? "none"}:${anchorType}`;
}

export function buildAnchorHistory(
  lunches: LunchWithDoctor[],
  dbAnchors: DayAnchorRow[],
  doctors: DoctorRow[],
): AnchorHistoryItem[] {
  const byKey = new Map<string, AnchorHistoryItem>();
  const doctorMap = new Map(doctors.map((d) => [d.id, d]));

  for (const lunch of lunches) {
    if (lunch.status === "cancelled" || lunch.is_date_tbd) continue;
    if (!lunch.doctor_id) continue;

    const key = historyKey(lunch.lunch_date.slice(0, 10), lunch.doctor_id, "lunch");
    byKey.set(key, {
      key,
      planDate: lunch.lunch_date.slice(0, 10),
      anchorType: "lunch",
      anchorTime: lunch.start_time,
      doctorId: lunch.doctor_id,
      doctorName: lunch.doctor_name ?? null,
      facilityName: lunch.facility_name ?? null,
      label: lunch.restaurant ?? lunch.lunch_order ?? null,
      restaurant: lunch.restaurant ?? lunch.lunch_order ?? null,
      foodNotes: lunch.food_notes ?? null,
      anchorDbId: null,
      lunchId: lunch.id,
      fromLunchSchedule: true,
    });
  }

  for (const anchor of dbAnchors) {
    const date = String(anchor.plan_date).slice(0, 10);
    const key = historyKey(date, anchor.doctor_id, anchor.anchor_type);
    const d = anchor.doctor_id ? doctorMap.get(anchor.doctor_id) : null;
    const existing = byKey.get(key);

    if (existing) {
      byKey.set(key, {
        ...existing,
        anchorDbId: anchor.id,
        anchorTime: anchor.anchor_time ?? existing.anchorTime,
        label: anchor.label ?? existing.label,
        restaurant: anchor.restaurant ?? existing.restaurant,
        foodNotes: anchor.food_notes ?? existing.foodNotes,
        doctorName: existing.doctorName ?? d?.name ?? null,
        facilityName: existing.facilityName ?? d?.facility_name ?? null,
        fromLunchSchedule: existing.fromLunchSchedule && !anchor.id,
      });
      continue;
    }

    byKey.set(key, {
      key,
      planDate: date,
      anchorType: anchor.anchor_type,
      anchorTime: anchor.anchor_time,
      doctorId: anchor.doctor_id,
      doctorName: d?.name ?? anchor.doctor_name ?? null,
      facilityName: d?.facility_name ?? anchor.facility_name ?? null,
      label: anchor.label,
      restaurant: anchor.restaurant ?? null,
      foodNotes: anchor.food_notes ?? null,
      anchorDbId: anchor.id,
      lunchId: anchor.lunch_id ?? null,
      fromLunchSchedule: false,
    });
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.planDate !== b.planDate) return b.planDate.localeCompare(a.planDate);
    return `${a.anchorTime ?? ""}${a.doctorName ?? ""}`.localeCompare(
      `${b.anchorTime ?? ""}${b.doctorName ?? ""}`,
    );
  });
}

export function formatAnchorDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
