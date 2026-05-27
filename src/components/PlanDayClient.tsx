"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DayAnchorRow, DoctorRow, PlannedStop } from "@/lib/types";
import { DayAnchorsPanel } from "./DayAnchorsPanel";
import { PlanControls } from "./PlanControls";
import { StopCard } from "./StopCard";

export function PlanDayClient({
  planDate,
  stops,
  doctors,
  anchors,
  prospectCount: initialCount,
  autoSuggestions,
}: {
  planDate: string;
  stops: PlannedStop[];
  doctors: DoctorRow[];
  anchors: DayAnchorRow[];
  prospectCount: number;
  autoSuggestions: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [saving, setSaving] = useState(false);

  async function saveProspectCount(next: number) {
    setCount(next);
    setSaving(true);
    try {
      const res = await fetch("/api/plan/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate, prospectCount: next }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not save visit count.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <PlanControls planDate={planDate} autoSuggestions={autoSuggestions} />
        <label className="block text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">
          Prospect visits this day
          <select
            value={count}
            disabled={saving}
            onChange={(e) => saveProspectCount(parseInt(e.target.value, 10))}
            className="ml-2 rounded border px-2 py-1 text-sm"
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
          {autoSuggestions
            ? "Suggested visits use priority and zone scoring. Clear the plan to build manually from Doctors."
            : "Lunches stay on the plan. Add visits from Doctors → Add to today's plan."}{" "}
          Lunches are at 12:00 PM; other stops can use Add specific time.
        </p>
      </section>

      <DayAnchorsPanel anchors={anchors} doctors={doctors} planDate={planDate} />

      {stops.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-6 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
          No stops for {planDate}. Schedule a lunch on a doctor profile.
        </p>
      ) : (
        <ol className="space-y-3">
          {stops.map((stop, index) => (
            <li key={`${stop.kind}-${stop.doctorId}-${stop.anchorId ?? index}`}>
              <StopCard stop={stop} planDate={planDate} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
