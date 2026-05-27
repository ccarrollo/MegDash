import type { PlannedStop, StopTimeOverride } from "./types";

export const LUNCH_START = "12:00";
export const LUNCH_END = "13:00";
const DEFAULT_VISIT_MINUTES = 45;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatDisplay(start)} – ${formatDisplay(end)}`;
}

function defaultDuration(kind: PlannedStop["kind"]): number {
  if (kind === "lunch") return 60;
  if (kind === "coffee") return 30;
  if (kind === "office") return 45;
  return DEFAULT_VISIT_MINUTES;
}

function overrideKey(s: PlannedStop) {
  return `${s.doctorId}:${s.kind}`;
}

/** Lunches always 12:00; other stops only get times when saved via "Add specific time". */
export function assignStopTimes(
  stops: PlannedStop[],
  overrides: StopTimeOverride[] = [],
): PlannedStop[] {
  const overrideMap = new Map(
    overrides.map((o) => [`${o.doctor_id}:${o.stop_kind}`, o]),
  );

  return stops.map((stop) => {
    if (stop.kind === "lunch") {
      return {
        ...stop,
        scheduledTime: LUNCH_START,
        suggestedStartTime: LUNCH_START,
        suggestedEndTime: LUNCH_END,
        timeOverrideId: undefined,
      };
    }

    const ov = overrideMap.get(overrideKey(stop));
    if (!ov) {
      return {
        ...stop,
        suggestedStartTime: undefined,
        suggestedEndTime: undefined,
        timeOverrideId: undefined,
      };
    }

    const startMins = toMinutes(ov.start_time.slice(0, 5));
    const endMins = ov.end_time
      ? toMinutes(ov.end_time.slice(0, 5))
      : startMins + defaultDuration(stop.kind);

    return {
      ...stop,
      suggestedStartTime: fromMinutes(startMins),
      suggestedEndTime: fromMinutes(endMins),
      timeOverrideId: ov.id,
    };
  });
}
