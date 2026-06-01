export const VISIT_TYPE_OUTCOMES = new Set([
  "in_person_visit",
  "remote_contact",
  "visited",
  "visit",
  "lunch",
  "visited_success",
  "visited_brief",
  "lunch_completed",
  "coffee_dropoff",
  "office_visit",
]);

export const DETAIL_GROUPS = [
  {
    title: "High-Value Wins",
    options: [
      { value: "commitment_to_prescribe", label: "Commitment to Prescribe" },
      { value: "clinical_data_pitched", label: "Clinical Data Pitched" },
    ],
  },
  {
    title: "Pipeline & Administrative Maintenance",
    options: [
      {
        value: "pending_order_documentation_followup",
        label: "Pending Order / Documentation Follow-up",
      },
      {
        value: "staff_gatekeeper_touchpoint",
        label: "Staff / Gatekeeper Touchpoint",
      },
      {
        value: "literature_brochures_left",
        label: "Literature / Patient Brochures Left",
      },
    ],
  },
  {
    title: "Friction & Blockers",
    options: [
      {
        value: "doctor_unavailable_no_contact",
        label: "Doctor Unavailable / No Contact",
      },
      { value: "competitor_locked", label: "Competitor-Locked" },
    ],
  },
  {
    title: "Feelings",
    options: [
      { value: "feeling_didnt_love_me", label: "Didn't ❤️ me" },
      { value: "feeling_eh", label: "eh" },
      { value: "feeling_loved_me", label: "❤️ed me" },
    ],
  },
] as const;

const DETAIL_LABELS: Record<string, string> = {};
for (const group of DETAIL_GROUPS) {
  for (const option of group.options) {
    DETAIL_LABELS[option.value] = option.label;
  }
}

const FEELING_VALUES = new Set<string>(
  DETAIL_GROUPS.find((g) => g.title === "Feelings")?.options.map((o) => o.value) ??
    [],
);

const OUTCOME_LABELS: Record<string, string> = {
  in_person_visit: "In-person visit",
  remote_contact: "Phone / text / email",
  visited: "Visit",
  visit: "Visit",
  lunch: "Lunch",
  visited_success: "Visit",
  visited_brief: "Brief visit",
  lunch_completed: "Lunch completed",
  coffee_dropoff: "Coffee drop-off",
  office_visit: "Office visit",
  ...DETAIL_LABELS,
};

export function outcomeLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? outcome.replaceAll("_", " ");
}

export function isVisitTypeOutcome(outcome: string): boolean {
  return (
    outcome === "in_person_visit" ||
    outcome === "remote_contact" ||
    (!DETAIL_LABELS[outcome] &&
      VISIT_TYPE_OUTCOMES.has(outcome) &&
      outcome !== "in_person_visit" &&
      outcome !== "remote_contact")
  );
}

export function isDetailOutcome(outcome: string): boolean {
  return Boolean(DETAIL_LABELS[outcome]);
}

export function isFeelingOutcome(outcome: string): boolean {
  return FEELING_VALUES.has(outcome);
}
