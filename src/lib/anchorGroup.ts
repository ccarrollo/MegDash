import { isMealAnchorType } from "./mealAnchor";
import type { DayAnchorRow } from "./types";

/** DB meal anchors created together share facility, type, and time. */
export function findMealAnchorSiblings(
  allOnDay: DayAnchorRow[],
  anchor: DayAnchorRow,
): DayAnchorRow[] {
  if (!isMealAnchorType(anchor.anchor_type)) return [anchor];
  if (anchor.lunch_id || anchor.order_id || anchor.id.startsWith("auto-")) {
    return [anchor];
  }

  const planDate = anchor.plan_date.slice(0, 10);
  const time = anchor.anchor_time?.slice(0, 5) ?? "";
  const facilityId = anchor.facility_id ?? "";

  return allOnDay.filter(
    (a) =>
      !a.lunch_id &&
      !a.order_id &&
      !a.id.startsWith("auto-") &&
      a.plan_date.slice(0, 10) === planDate &&
      a.anchor_type === anchor.anchor_type &&
      (a.facility_id ?? "") === facilityId &&
      (a.anchor_time?.slice(0, 5) ?? "") === time,
  );
}

export function siblingDoctorIds(siblings: DayAnchorRow[]): string[] {
  return [
    ...new Set(
      siblings.map((a) => a.doctor_id).filter((id): id is string => Boolean(id)),
    ),
  ];
}

export function siblingDbIds(siblings: DayAnchorRow[]): string[] {
  return siblings
    .map((a) => a.id)
    .filter((id) => id && !id.startsWith("auto-"));
}

export function formatDoctorNames(
  siblings: DayAnchorRow[],
  doctors?: { id: string; name: string }[],
): string {
  const names = siblings
    .map((a) => {
      if (a.doctor_id) {
        const fromDoctor = doctors?.find((d) => d.id === a.doctor_id)?.name;
        if (fromDoctor) return fromDoctor;
      }
      return a.doctor_name ?? null;
    })
    .filter((n): n is string => Boolean(n));
  return [...new Set(names)].join(", ") || "No doctor";
}
