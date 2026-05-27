import { PRIORITY_WEIGHT, STATUS_WEIGHT } from "./constants";
import {
  isRoadTripZone,
  SAME_DAY_ZONES_FROM_AUSTIN,
  ZONE_LABELS,
} from "./zones";
import type { DoctorRow, PlannedStop, TerritoryZone } from "./types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function scoreDoctor(d: DoctorRow, anchorZone: TerritoryZone): number {
  let score = 0;

  score += PRIORITY_WEIGHT[d.priority] ?? 1;
  score += STATUS_WEIGHT[d.status] ?? 0;

  if (d.days_since_visit != null) {
    score += Math.min(d.days_since_visit / 7, 5);
  } else {
    score += 4;
  }

  if (d.follow_up_date && d.follow_up_date <= todayIso()) {
    score += 8;
  }

  if (d.zone === anchorZone) {
    score += 3;
  } else if (
    SAME_DAY_ZONES_FROM_AUSTIN.includes(anchorZone) &&
    SAME_DAY_ZONES_FROM_AUSTIN.includes(d.zone)
  ) {
    score += 1;
  } else if (d.zone !== anchorZone) {
    score -= 6;
  }

  return score;
}

export function buildDailyPlan(
  doctors: DoctorRow[],
  options?: { zone?: TerritoryZone; maxStops?: number },
): { anchorZone: TerritoryZone; stops: PlannedStop[] } {
  const date = todayIso();
  const maxStops = options?.maxStops ?? 6;

  const todaysLunches = doctors.filter(
    (d) => d.lunch_date === date || (d.lunch_scheduled && d.lunch_date === date),
  );

  let anchorZone: TerritoryZone = options?.zone ?? "austin_core";
  if (todaysLunches.length > 0) {
    anchorZone = todaysLunches[0].zone;
  }

  const stops: PlannedStop[] = [];

  for (const d of todaysLunches) {
    stops.push({
      doctorId: d.id,
      doctorName: d.name,
      facilityName: d.facility_name,
      address: d.address,
      zone: d.zone,
      kind: "lunch",
      reason: "Lunch today",
      score: 100,
    });
  }

  const lunchFacilityIds = new Set(todaysLunches.map((d) => d.facility_id));

  const candidates = doctors
    .filter((d) => !lunchFacilityIds.has(d.facility_id) || todaysLunches.length === 0)
    .filter((d) => d.lunch_date !== date)
    .map((d) => ({
      d,
      score: scoreDoctor(d, anchorZone),
    }))
    .filter(({ d, score }) => {
      if (isRoadTripZone(anchorZone)) {
        return d.zone === anchorZone && score > 0;
      }
      if (isRoadTripZone(d.zone) && anchorZone !== d.zone) {
        return false;
      }
      return score > 0;
    })
    .sort((a, b) => b.score - a.score);

  for (const { d, score } of candidates) {
    if (stops.filter((s) => s.kind !== "lunch").length >= maxStops - stops.length) {
      break;
    }

    const isFollowUp =
      d.follow_up_date != null && d.follow_up_date <= date;

    const reasons: string[] = [];
    if (isFollowUp) reasons.push("Follow-up due");
    if (d.priority === "High") reasons.push("High priority");
    if (d.days_since_visit != null) {
      reasons.push(`${d.days_since_visit} days since visit`);
    } else {
      reasons.push("No visit logged");
    }
    if (d.zone !== anchorZone) {
      reasons.push(ZONE_LABELS[d.zone]);
    }

    stops.push({
      doctorId: d.id,
      doctorName: d.name,
      facilityName: d.facility_name,
      address: d.address,
      zone: d.zone,
      kind: isFollowUp ? "follow_up" : "visit",
      reason: reasons.join(" · "),
      score,
    });
  }

  return { anchorZone, stops };
}
