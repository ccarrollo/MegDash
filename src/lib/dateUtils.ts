const TZ = "America/Chicago";

/** YYYY-MM-DD for territory planning (Austin / Central) */
export function planDateIso(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function parsePlanDate(value?: string | null): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return planDateIso();
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatPlanDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function isTodayPlanDate(iso: string): boolean {
  return iso === planDateIso();
}
