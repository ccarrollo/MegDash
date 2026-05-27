"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LunchRow } from "@/lib/types";

export function LunchEditor({ lunch }: { lunch: LunchRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [lunchDate, setLunchDate] = useState(lunch.lunch_date);
  const [status, setStatus] = useState(lunch.status);
  const [restaurant, setRestaurant] = useState(lunch.restaurant ?? lunch.lunch_order ?? "");
  const [headcount, setHeadcount] = useState(
    lunch.headcount != null ? String(lunch.headcount) : "",
  );
  const [totalCost, setTotalCost] = useState(
    lunch.total_cost != null ? String(lunch.total_cost) : "",
  );
  const [foodNotes, setFoodNotes] = useState(lunch.food_notes ?? "");
  const [interactionNotes, setInteractionNotes] = useState(lunch.interaction_notes ?? "");

  useEffect(() => {
    setLunchDate(lunch.lunch_date);
    setStatus(lunch.status);
    setRestaurant(lunch.restaurant ?? lunch.lunch_order ?? "");
    setHeadcount(lunch.headcount != null ? String(lunch.headcount) : "");
    setTotalCost(lunch.total_cost != null ? String(lunch.total_cost) : "");
    setFoodNotes(lunch.food_notes ?? "");
    setInteractionNotes(lunch.interaction_notes ?? "");
  }, [lunch]);

  const heads = parseInt(headcount, 10);
  const total = parseFloat(totalCost);
  const perHead =
    Number.isFinite(heads) && heads > 0 && Number.isFinite(total)
      ? (total / heads).toFixed(2)
      : lunch.cost_per_head != null
        ? String(lunch.cost_per_head)
        : null;

  async function save() {
    if (!lunchDate) {
      alert("Lunch date is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/lunches/${lunch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lunchDate,
          startTime: "12:00",
          status,
          restaurant: restaurant.trim() || null,
          lunchOrder: restaurant.trim() || null,
          headcount: headcount ? parseInt(headcount, 10) : null,
          totalCost: totalCost ? parseFloat(totalCost) : null,
          foodNotes: foodNotes.trim() || null,
          interactionNotes: interactionNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Save failed");
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save lunch.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
          Date
          <input
            type="date"
            value={lunchDate}
            onChange={(e) => setLunchDate(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
          <span className="block">Time</span>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">12:00 PM</p>
        </div>
        <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 sm:col-span-2">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          >
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 sm:col-span-2">
          Restaurant / place
          <input
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            placeholder="Where the food is from"
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
          People in office
          <input
            type="number"
            min={0}
            value={headcount}
            onChange={(e) => setHeadcount(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
          Total meal cost ($)
          <input
            type="number"
            min={0}
            step="0.01"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        {perHead != null && (
          <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 sm:col-span-2">
            ≈ <strong>${perHead}</strong> per person
            {Number.isFinite(heads) && heads > 0 && Number.isFinite(total)
              ? " (from total ÷ headcount)"
              : ""}
          </p>
        )}
        <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 sm:col-span-2">
          Food / dietary notes
          <textarea
            rows={2}
            value={foodNotes}
            onChange={(e) => setFoodNotes(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 sm:col-span-2">
          Interaction notes
          <textarea
            rows={2}
            value={interactionNotes}
            onChange={(e) => setInteractionNotes(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="mt-3 rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save lunch"}
      </button>
    </div>
  );
}
