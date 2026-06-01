import { planDateIso } from "./dateUtils";
import type { DoctorRow, FacilityRow, LunchRow } from "./types";

export type DoctorSortKey =
  | "visit_desc"
  | "visit_asc"
  | "contact_desc"
  | "contact_asc"
  | "name"
  | "lunch_date";

function daysSinceContact(d: DoctorRow): number | null {
  return d.days_since_contact ?? d.days_since_activity ?? null;
}

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

export function filterDoctors(
  doctors: DoctorRow[],
  query: string,
  filters: {
    zone?: string;
    hasLunch?: boolean;
    queueVisibility?: "all" | "in_queue" | "excluded";
    includeArchived?: boolean;
  },
): DoctorRow[] {
  return doctors.filter((d) => {
    if (!filters.includeArchived && d.status.trim().toLowerCase() === "9. archived") {
      return false;
    }
    if (filters.zone && d.zone !== filters.zone) return false;
    if (filters.hasLunch) {
      const today = planDateIso();
      if (!d.lunch_date || d.lunch_date < today) return false;
    }
    if (filters.queueVisibility === "in_queue" && d.daily_queue_hidden) {
      return false;
    }
    if (filters.queueVisibility === "excluded" && !d.daily_queue_hidden) {
      return false;
    }
    if (!query.trim()) return true;
    const haystack = [
      d.name,
      d.facility_name,
      d.address,
      d.city,
      d.location_label,
      d.status,
      d.front_desk_notes,
      d.competitor_notes,
      d.interaction_notes,
      d.follow_up_lunch,
    ]
      .filter(Boolean)
      .join(" ");
    return matchesQuery(haystack, query);
  });
}

export function sortDoctors(
  doctors: DoctorRow[],
  sortKey: DoctorSortKey,
): DoctorRow[] {
  const list = [...doctors];
  switch (sortKey) {
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "lunch_date":
      return list.sort((a, b) => {
        if (!a.lunch_date && !b.lunch_date) return 0;
        if (!a.lunch_date) return 1;
        if (!b.lunch_date) return -1;
        return a.lunch_date.localeCompare(b.lunch_date);
      });
    case "visit_asc":
      return list.sort(
        (a, b) => (a.days_since_visit ?? 999) - (b.days_since_visit ?? 999),
      );
    case "contact_desc":
      return list.sort((a, b) => {
        const ac = daysSinceContact(a);
        const bc = daysSinceContact(b);
        if (ac == null && bc == null) return 0;
        if (ac == null) return 1;
        if (bc == null) return -1;
        return bc - ac;
      });
    case "contact_asc":
      return list.sort((a, b) => {
        const ac = daysSinceContact(a);
        const bc = daysSinceContact(b);
        if (ac == null && bc == null) return 0;
        if (ac == null) return 1;
        if (bc == null) return -1;
        return ac - bc;
      });
    case "visit_desc":
    default:
      return list.sort(
        (a, b) => (b.days_since_visit ?? -1) - (a.days_since_visit ?? -1),
      );
  }
}

import type { LunchWithDoctor } from "./types";
export type { LunchWithDoctor };

export function filterLunches(
  items: LunchWithDoctor[],
  query: string,
): LunchWithDoctor[] {
  if (!query.trim()) return items;
  return items.filter((l) => {
    const haystack = [
      l.doctor_name,
      l.facility_name,
      l.lunch_date,
      l.restaurant,
      l.lunch_order,
      l.food_notes,
      l.status,
    ]
      .filter(Boolean)
      .join(" ");
    return matchesQuery(haystack, query);
  });
}

export function filterFacilities(
  items: FacilityRow[],
  query: string,
): FacilityRow[] {
  if (!query.trim()) return items;
  return items.filter((f) => {
    const haystack = [
      f.name,
      f.address,
      f.city,
      f.location_label,
      f.office_vibe,
      f.zone,
    ]
      .filter(Boolean)
      .join(" ");
    return matchesQuery(haystack, query);
  });
}
