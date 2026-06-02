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

/** HH:MM or HH:MM:SS → "3:45 PM" */
export function formatTime12(value: string | null | undefined): string {
  if (!value) return "No time";
  return formatDisplay(value.slice(0, 5));
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatDisplay(start)} – ${formatDisplay(end)}`;
}

function defaultDuration(kind: PlannedStop["kind"]): number {
  if (kind === "lunch") return 60;
  if (kind === "coffee") return 30;
  if (kind === "fitting") return 60;
  if (kind === "office") return 45;
  return DEFAULT_VISIT_MINUTES;
}

function overrideKey(s: PlannedStop) {
  return `${s.doctorId}:${s.kind}`;
}

function anchorStartEnd(
  scheduledTime: string | null | undefined,
  kind: PlannedStop["kind"],
): { start: string; end: string } | null {
  const start = scheduledTime?.slice(0, 5);
  if (!start) return null;
  return {
    start,
    end: fromMinutes(toMinutes(start) + defaultDuration(kind)),
  };
}

export function assignStopTimes(
  stops: PlannedStop[],
  overrides: StopTimeOverride[] = [],
): PlannedStop[] {
  const overrideMap = new Map(
    overrides.map((o) => [`${o.doctor_id}:${o.stop_kind}`, o]),
  );

  return stops.map((stop) => {
    if (stop.kind === "lunch") {
      const lunchStart = stop.scheduledTime?.slice(0, 5) ?? LUNCH_START;
      const lunchEnd = fromMinutes(toMinutes(lunchStart) + defaultDuration("lunch"));
      return {
        ...stop,
        scheduledTime: lunchStart,
        suggestedStartTime: lunchStart,
        suggestedEndTime: lunchEnd,
        timeOverrideId: undefined,
      };
    }

    const ov = overrideMap.get(overrideKey(stop));
    if (ov) {
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
    }

    const anchorTimes = anchorStartEnd(stop.scheduledTime, stop.kind);
    if (anchorTimes) {
      return {
        ...stop,
        suggestedStartTime: anchorTimes.start,
        suggestedEndTime: anchorTimes.end,
        timeOverrideId: undefined,
      };
    }

    return {
      ...stop,
      suggestedStartTime: undefined,
      suggestedEndTime: undefined,
      timeOverrideId: undefined,
    };
  });
}
