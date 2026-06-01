"use client";

import { computeCostPerHead } from "@/lib/mealAnchor";

export function AnchorMealFields({
  restaurant,
  onRestaurantChange,
  headcount,
  onHeadcountChange,
  totalCost,
  onTotalCostChange,
  foodNotes,
  onFoodNotesChange,
  interactionNotes,
  onInteractionNotesChange,
}: {
  restaurant: string;
  onRestaurantChange: (v: string) => void;
  headcount: string;
  onHeadcountChange: (v: string) => void;
  totalCost: string;
  onTotalCostChange: (v: string) => void;
  foodNotes: string;
  onFoodNotesChange: (v: string) => void;
  interactionNotes: string;
  onInteractionNotesChange: (v: string) => void;
}) {
  const heads = parseInt(headcount, 10);
  const total = parseFloat(totalCost);
  const perHead =
    Number.isFinite(heads) && heads > 0 && Number.isFinite(total)
      ? computeCostPerHead(total, heads)?.toFixed(2)
      : null;

  return (
    <div className="grid gap-2 rounded-lg border border-violet-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-950/50">
      <p className="text-xs font-medium text-violet-700 dark:text-slate-400">
        Optional meal details
      </p>
      <label className="text-xs text-violet-700 dark:text-slate-400">
        Restaurant / place
        <input
          value={restaurant}
          onChange={(e) => onRestaurantChange(e.target.value)}
          placeholder="Where the food is from"
          className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-violet-700 dark:text-slate-400">
          People in office
          <input
            type="number"
            min={0}
            value={headcount}
            onChange={(e) => onHeadcountChange(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-violet-700 dark:text-slate-400">
          Total meal cost ($)
          <input
            type="number"
            min={0}
            step="0.01"
            value={totalCost}
            onChange={(e) => onTotalCostChange(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      {perHead != null && (
        <p className="text-xs text-violet-800 dark:text-slate-400">
          ≈ <strong>${perHead}</strong> per person
        </p>
      )}
      <label className="text-xs text-violet-700 dark:text-slate-400">
        Food / allergies / dietary
        <textarea
          rows={2}
          value={foodNotes}
          onChange={(e) => onFoodNotesChange(e.target.value)}
          className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs text-violet-700 dark:text-slate-400">
        Notes (scheduling, who attended, etc.)
        <textarea
          rows={2}
          value={interactionNotes}
          onChange={(e) => onInteractionNotesChange(e.target.value)}
          className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}
