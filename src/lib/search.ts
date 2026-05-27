import type { DoctorRow, LunchRow } from "./types";

export type DoctorSortKey =
  | "visit_desc"
  | "visit_asc"
  | "name"
  | "priority"
  | "lunch_date";

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

export function filterDoctors(
  doctors: DoctorRow[],
  query: string,
  filters: { zone?: string; priority?: string; hasLunch?: boolean },
): DoctorRow[] {
  return doctors.filter((d) => {
    if (filters.zone && d.zone !== filters.zone) return false;
    if (filters.priority && d.priority !== filters.priority) return false;
    if (filters.hasLunch && !d.lunch_date) return false;
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
    case "priority": {
      const w = { High: 0, Medium: 1, Low: 2 };
      return list.sort(
        (a, b) => (w[a.priority as keyof typeof w] ?? 9) - (w[b.priority as keyof typeof w] ?? 9),
      );
    }
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
