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

/** First day of month offset by `delta` months from the month in `iso` (YYYY-MM-DD). */
export function addMonthsIso(iso: string, delta: number): string {
  const [y, m] = iso.split("-").map(Number);
  let month = m - 1 + delta;
  let year = y;
  while (month < 0) {
    month += 12;
    year -= 1;
  }
  while (month > 11) {
    month -= 12;
    year += 1;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

const MONTH_NAMES_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTH_NAMES_LONG[m - 1]} ${y}`;
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
