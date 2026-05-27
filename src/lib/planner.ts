import { planDateIso } from "./dateUtils";
import { PRIORITY_WEIGHT, STATUS_WEIGHT } from "./constants";
import {
  isRoadTripZone,
  SAME_DAY_ZONES_FROM_AUSTIN,
  ZONE_LABELS,
} from "./zones";
import type { DayAnchorRow, DoctorRow, LunchRow, PlannedStop, TerritoryZone } from "./types";

export type PlannerOptions = {
  planDate?: string;
  zone?: TerritoryZone;
  prospectCount?: number;
  lunchesOnDate?: LunchRow[];
};

const DEFAULT_PROSPECT_COUNT = 6;

function scoreDoctor(
  d: DoctorRow,
  anchorZone: TerritoryZone,
  morningFacilityId: string | null,
  planDate: string,
): number {
  let score = 0;

  score += PRIORITY_WEIGHT[d.priority] ?? 1;
  score += STATUS_WEIGHT[d.status] ?? 0;

  if (d.days_since_visit != null) {
    score += Math.min(d.days_since_visit / 7, 5);
  } else {
    score += 4;
  }

  if (d.follow_up_date && d.follow_up_date <= planDate) {
    score += 8;
  }

  if (morningFacilityId && d.facility_id === morningFacilityId) {
    score += 6;
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

const ANCHOR_KIND: Record<string, PlannedStop["kind"]> = {
  coffee: "coffee",
  lunch: "lunch",
  office: "office",
};

const ANCHOR_REASON: Record<string, string> = {
  coffee: "Morning coffee / drop-off anchor",
  lunch: "Lunch anchor",
  office: "Office visit anchor",
};

function resolveAnchorZone(
  doctors: DoctorRow[],
  anchors: DayAnchorRow[],
  lunchesOnDate: LunchRow[],
  planDate: string,
  fallback: TerritoryZone,
): TerritoryZone {
  const sortedAnchors = [...anchors].sort((a, b) => {
    const ta = a.anchor_time ?? "12:00:00";
    const tb = b.anchor_time ?? "12:00:00";
    return ta.localeCompare(tb) || a.sort_order - b.sort_order;
  });

  const firstAnchorDoctor = sortedAnchors[0]?.doctor_id
    ? doctors.find((d) => d.id === sortedAnchors[0].doctor_id)
    : null;
  if (firstAnchorDoctor) return firstAnchorDoctor.zone;

  const firstLunch = lunchesOnDate[0];
  if (firstLunch?.doctor_id) {
    const doc = doctors.find((d) => d.id === firstLunch.doctor_id);
    if (doc) return doc.zone;
  }

  const lunchesFromDoctor = doctors.filter((d) => d.lunch_date === planDate);
  if (lunchesFromDoctor.length > 0) return lunchesFromDoctor[0].zone;

  return fallback;
}

/** Lunches, coffee, and office anchors only — no auto prospect picks. */
export function buildScheduledStops(
  doctors: DoctorRow[],
  anchors: DayAnchorRow[] = [],
  options?: PlannerOptions,
): { anchorZone: TerritoryZone; planDate: string; stops: PlannedStop[] } {
  const planDate = options?.planDate ?? planDateIso();
  const lunchesOnDate = options?.lunchesOnDate ?? [];
  const anchorZone = resolveAnchorZone(
    doctors,
    anchors,
    lunchesOnDate,
    planDate,
    options?.zone ?? "austin_core",
  );

  const sortedAnchors = [...anchors].sort((a, b) => {
    const ta = a.anchor_time ?? "12:00:00";
    const tb = b.anchor_time ?? "12:00:00";
    return ta.localeCompare(tb) || a.sort_order - b.sort_order;
  });

  const stops: PlannedStop[] = [];
  const usedDoctorIds = new Set<string>();

  for (const anchor of sortedAnchors) {
    if (!anchor.doctor_id) continue;
    const d = doctors.find((doc) => doc.id === anchor.doctor_id);
    if (!d) continue;
    usedDoctorIds.add(d.id);

    const kind = ANCHOR_KIND[anchor.anchor_type] ?? "lunch";
    stops.push({
      doctorId: d.id,
      doctorName: d.name,
      facilityName: d.facility_name,
      address: d.address,
      zone: d.zone,
      kind,
      scheduledTime: anchor.anchor_time,
      anchorId: anchor.id,
      reason: anchor.label?.trim() || ANCHOR_REASON[anchor.anchor_type] || "Scheduled anchor",
      score: 100,
    });
  }

  for (const lunch of lunchesOnDate) {
    if (!lunch.doctor_id || usedDoctorIds.has(lunch.doctor_id)) continue;
    if (lunch.status === "cancelled") continue;
    const d = doctors.find((doc) => doc.id === lunch.doctor_id);
    if (!d) continue;
    usedDoctorIds.add(d.id);
    stops.push({
      doctorId: d.id,
      doctorName: d.name,
      facilityName: d.facility_name,
      address: d.address,
      zone: d.zone,
      kind: "lunch",
      scheduledTime: "12:00",
      lunchId: lunch.id,
      reason: `Lunch · ${planDate}`,
      score: 95,
    });
  }

  for (const d of doctors) {
    if (usedDoctorIds.has(d.id)) continue;
    if (d.lunch_date !== planDate) continue;
    const hasLunchRow = lunchesOnDate.some(
      (l) => l.doctor_id === d.id && l.status !== "cancelled",
    );
    if (hasLunchRow) continue;
    usedDoctorIds.add(d.id);
    stops.push({
      doctorId: d.id,
      doctorName: d.name,
      facilityName: d.facility_name,
      address: d.address,
      zone: d.zone,
      kind: "lunch",
      scheduledTime: "12:00",
      reason: `Lunch scheduled (${planDate})`,
      score: 95,
    });
  }

  return { anchorZone, planDate, stops };
}

export function buildDailyPlan(
  doctors: DoctorRow[],
  anchors: DayAnchorRow[] = [],
  options?: PlannerOptions,
): { anchorZone: TerritoryZone; planDate: string; stops: PlannedStop[] } {
  const planDate = options?.planDate ?? planDateIso();
  const prospectCount = options?.prospectCount ?? DEFAULT_PROSPECT_COUNT;
  const lunchesOnDate = options?.lunchesOnDate ?? [];

  const { anchorZone, stops: scheduledStops } = buildScheduledStops(
    doctors,
    anchors,
    options,
  );
  const stops = [...scheduledStops];
  const usedDoctorIds = new Set(stops.map((s) => s.doctorId));

  const sortedAnchors = [...anchors].sort((a, b) => {
    const ta = a.anchor_time ?? "12:00:00";
    const tb = b.anchor_time ?? "12:00:00";
    return ta.localeCompare(tb) || a.sort_order - b.sort_order;
  });

  const morningAnchor = sortedAnchors.find(
    (a) =>
      a.anchor_type === "coffee" ||
      (a.anchor_time != null && a.anchor_time < "11:00:00"),
  );
  const morningFacilityId = morningAnchor?.doctor_id
    ? doctors.find((d) => d.id === morningAnchor.doctor_id)?.facility_id ?? null
    : null;

  const anchorFacilityIds = new Set(
    [...usedDoctorIds]
      .map((id) => doctors.find((d) => d.id === id)?.facility_id)
      .filter((id): id is string => Boolean(id)),
  );

  const candidates = doctors
    .filter((d) => !usedDoctorIds.has(d.id))
    .filter((d) => d.lunch_date !== planDate)
    .map((d) => ({
      d,
      score: scoreDoctor(d, anchorZone, morningFacilityId, planDate),
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

  const morningTarget = Math.ceil(prospectCount / 2);
  const afternoonTarget = prospectCount - morningTarget;

  let morningAdded = 0;
  let afternoonAdded = 0;

  for (const { d, score } of candidates) {
    if (morningAdded >= morningTarget && afternoonAdded >= afternoonTarget) break;

    const period: "morning" | "afternoon" =
      morningAdded < morningTarget ? "morning" : "afternoon";
    if (period === "afternoon" && afternoonAdded >= afternoonTarget) continue;
    if (period === "morning" && morningAdded >= morningTarget) continue;

    const isFollowUp =
      d.follow_up_date != null && d.follow_up_date <= planDate;

    const reasons: string[] = [];
    if (morningFacilityId && d.facility_id === morningFacilityId) {
      reasons.push("Same office as morning anchor");
    }
    if (isFollowUp) reasons.push("Follow-up due");
    if (d.priority === "High") reasons.push("High priority");
    if (d.days_since_visit != null) {
      reasons.push(`${d.days_since_visit} days since visit`);
    } else if (d.days_since_activity != null) {
      reasons.push(`${d.days_since_activity}d since activity`);
    } else {
      reasons.push("No visit logged");
    }
    if (d.zone !== anchorZone) reasons.push(ZONE_LABELS[d.zone]);
    if (anchorFacilityIds.has(d.facility_id)) {
      reasons.push("Near today's anchors");
    }

    stops.push({
      doctorId: d.id,
      doctorName: d.name,
      facilityName: d.facility_name,
      address: d.address,
      zone: d.zone,
      kind: isFollowUp ? "follow_up" : "visit",
      dayPeriod: period,
      reason: reasons.join(" · "),
      score,
    });

    if (period === "morning") morningAdded += 1;
    else afternoonAdded += 1;
  }

  return { anchorZone, planDate, stops };
}
