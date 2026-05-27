import { OUTCOMES_UPDATE_LAST_VISIT } from "./constants";

/** Outcomes that count toward days-since-visit (includes legacy import values) */
export const PHYSICAL_VISIT_OUTCOMES = [
  ...OUTCOMES_UPDATE_LAST_VISIT,
  "in_person_visit",
  "visited",
  "visit",
  "lunch",
] as const;

export const PHYSICAL_VISIT_OUTCOMES_SQL = PHYSICAL_VISIT_OUTCOMES.map(
  (o) => `'${o}'`,
).join(", ");

/** Outcomes that count toward days-since-contact. */
export const CONTACT_OUTCOMES = [
  ...PHYSICAL_VISIT_OUTCOMES,
  "remote_contact",
] as const;

export const CONTACT_OUTCOMES_SQL = CONTACT_OUTCOMES.map((o) => `'${o}'`).join(
  ", ",
);

export function outcomeUpdatesLastVisit(outcome: string): boolean {
  return (
    OUTCOMES_UPDATE_LAST_VISIT.has(outcome) ||
    outcome === "in_person_visit" ||
    outcome === "visited" ||
    outcome === "visit" ||
    outcome === "lunch"
  );
}

export function outcomeUpdatesLastContact(outcome: string): boolean {
  return CONTACT_OUTCOMES.includes(outcome as (typeof CONTACT_OUTCOMES)[number]);
}
