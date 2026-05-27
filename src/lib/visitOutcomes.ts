import { OUTCOMES_UPDATE_LAST_VISIT } from "./constants";

/** Outcomes that count toward days-since-visit (includes legacy import values) */
export const PHYSICAL_VISIT_OUTCOMES = [
  ...OUTCOMES_UPDATE_LAST_VISIT,
  "visited",
  "visit",
  "lunch",
] as const;

export const PHYSICAL_VISIT_OUTCOMES_SQL = PHYSICAL_VISIT_OUTCOMES.map(
  (o) => `'${o}'`,
).join(", ");

export function outcomeUpdatesLastVisit(outcome: string): boolean {
  return (
    OUTCOMES_UPDATE_LAST_VISIT.has(outcome) ||
    outcome === "visited" ||
    outcome === "visit" ||
    outcome === "lunch"
  );
}
