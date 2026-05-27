export const PRIORITY_WEIGHT: Record<string, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export const STATUS_WEIGHT: Record<string, number> = {
  "1. Active": 3,
  "2. Introduced": 2,
  "3. Got Card Only": 1,
  "4. No Card, FWD info": 1,
  "8. Target": 1,
};

/** Outcomes that update "days since last visit" when logged */
export const OUTCOMES_UPDATE_LAST_VISIT = new Set([
  "visited_success",
  "visited_brief",
  "lunch_completed",
  "coffee_dropoff",
  "office_visit",
]);

export const VISIT_OUTCOMES = [
  { value: "visited_success", label: "Visited — productive", updatesLastVisit: true },
  { value: "visited_brief", label: "Visited — brief drop-off", updatesLastVisit: true },
  { value: "coffee_dropoff", label: "Coffee / drop-off", updatesLastVisit: true },
  { value: "office_visit", label: "Office visit", updatesLastVisit: true },
  { value: "lunch_completed", label: "Lunch completed", updatesLastVisit: true },
  { value: "order_obtained", label: "Order obtained", updatesLastVisit: false },
  { value: "no_contact", label: "No contact", updatesLastVisit: false },
  { value: "rescheduled", label: "Rescheduled", updatesLastVisit: false },
  { value: "needs_followup", label: "Needs follow-up", updatesLastVisit: false },
  { value: "competitor_locked", label: "Competitor-locked", updatesLastVisit: false },
] as const;

export const ANCHOR_TYPES = [
  { value: "coffee", label: "Coffee / morning drop-off" },
  { value: "lunch", label: "Lunch" },
  { value: "office", label: "Office visit" },
] as const;
