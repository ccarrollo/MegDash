export const MEAL_ANCHOR_TYPES = ["coffee", "breakfast", "lunch"] as const;

export type MealAnchorType = (typeof MEAL_ANCHOR_TYPES)[number];

export function isMealAnchorType(type: string): type is MealAnchorType {
  return (MEAL_ANCHOR_TYPES as readonly string[]).includes(type);
}

export type MealAnchorInput = {
  restaurant?: string | null;
  foodNotes?: string | null;
  interactionNotes?: string | null;
  headcount?: number | null;
  totalCost?: number | null;
};

export function computeCostPerHead(
  totalCost: number | null | undefined,
  headcount: number | null | undefined,
): number | null {
  if (totalCost == null || headcount == null || headcount <= 0) return null;
  return Math.round((totalCost / headcount) * 100) / 100;
}

export function parseMealNumbers(
  headcountRaw?: string | number | null,
  totalCostRaw?: string | number | null,
): { headcount: number | null; totalCost: number | null; costPerHead: number | null } {
  const headcount =
    headcountRaw === "" || headcountRaw == null
      ? null
      : typeof headcountRaw === "number"
        ? headcountRaw
        : parseInt(String(headcountRaw), 10);
  const totalCost =
    totalCostRaw === "" || totalCostRaw == null
      ? null
      : typeof totalCostRaw === "number"
        ? totalCostRaw
        : parseFloat(String(totalCostRaw));

  const heads = Number.isFinite(headcount) && headcount! > 0 ? headcount! : null;
  const total = Number.isFinite(totalCost) ? totalCost! : null;

  return {
    headcount: heads,
    totalCost: total,
    costPerHead: computeCostPerHead(total, heads),
  };
}

export function mealFieldsForDb(input: MealAnchorInput): Record<string, string | number | null> {
  const row: Record<string, string | number | null> = {};
  const restaurant = input.restaurant?.trim();
  if (restaurant) row.restaurant = restaurant;
  const food = input.foodNotes?.trim();
  if (food) row.food_notes = food;
  const notes = input.interactionNotes?.trim();
  if (notes) row.interaction_notes = notes;
  if (input.headcount != null) row.headcount = input.headcount;
  if (input.totalCost != null) row.total_cost = input.totalCost;
  if (input.totalCost != null && input.headcount != null && input.headcount > 0) {
    row.cost_per_head = computeCostPerHead(input.totalCost, input.headcount);
  } else if (input.totalCost == null) {
    row.cost_per_head = null;
  }
  return row;
}

export function lunchPayloadFromMeal(input: MealAnchorInput & {
  planDate: string;
  facilityId?: string | null;
  anchorTime?: string | null;
  label?: string | null;
}) {
  const time = input.anchorTime ? `${input.anchorTime}:00` : "12:00:00";
  const restaurant = input.restaurant?.trim() || input.label?.trim() || null;
  return {
    facility_id: input.facilityId ?? null,
    lunch_date: input.planDate,
    start_time: time,
    status: "scheduled" as const,
    restaurant,
    lunch_order: restaurant,
    food_notes: input.foodNotes?.trim() || null,
    interaction_notes: input.interactionNotes?.trim() || null,
    headcount: input.headcount ?? null,
    total_cost: input.totalCost ?? null,
    cost_per_head: computeCostPerHead(input.totalCost ?? null, input.headcount ?? null),
  };
}

export type MealDisplayFields = {
  restaurant?: string | null;
  food_notes?: string | null;
  interaction_notes?: string | null;
  headcount?: number | null;
  total_cost?: number | null;
  cost_per_head?: number | null;
};

export function formatMealCostLine(m: MealDisplayFields): string | null {
  const parts: string[] = [];
  if (m.total_cost != null) parts.push(`$${m.total_cost.toFixed(2)} total`);
  if (m.cost_per_head != null) parts.push(`$${m.cost_per_head.toFixed(2)}/person`);
  else if (m.headcount != null && m.headcount > 0) parts.push(`${m.headcount} people`);
  return parts.length ? parts.join(" · ") : null;
}
