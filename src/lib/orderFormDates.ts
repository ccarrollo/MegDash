/** YYYY-MM-DD from ISO timestamp */
export function orderEnteredDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

export function defaultOrderEnteredDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function splitFittingDateTime(value: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!value?.trim()) return { date: "", time: "" };
  const normalized = value.replace("Z", "").slice(0, 16);
  const [date, timePart] = normalized.split("T");
  return {
    date: date ?? "",
    time: timePart ? timePart.slice(0, 5) : "",
  };
}

export function combineFittingDateTime(
  date: string,
  time: string,
): string | null {
  const d = date.trim();
  if (!d) return null;
  const t = time.trim() || "12:00";
  return `${d}T${t}`;
}

/** Dismiss native date/time picker after selection (mobile Safari, etc.). */
export function dismissPickerAfterChange(
  e: { target: HTMLInputElement },
  apply: (value: string) => void,
) {
  const input = e.target;
  const value = input.value;
  // Blur before React re-render so the native picker doesn't stay open.
  input.blur();
  apply(value);
  requestAnimationFrame(() => {
    input.blur();
    window.setTimeout(() => input.blur(), 50);
  });
}
