import { formatMealCostLine, type MealDisplayFields } from "@/lib/mealAnchor";

export function AnchorMealSummary({ meal }: { meal: MealDisplayFields }) {
  const costLine = formatMealCostLine(meal);
  const hasDetail =
    meal.restaurant ||
    costLine ||
    meal.food_notes ||
    meal.interaction_notes;

  if (!hasDetail) return null;

  return (
    <div className="mt-1 space-y-0.5 text-xs text-violet-700 dark:text-slate-400">
      {meal.restaurant && <p>📍 {meal.restaurant}</p>}
      {costLine && <p>{costLine}</p>}
      {meal.food_notes && (
        <p className="line-clamp-2">Dietary: {meal.food_notes}</p>
      )}
      {meal.interaction_notes && (
        <p className="line-clamp-2">Notes: {meal.interaction_notes}</p>
      )}
    </div>
  );
}
