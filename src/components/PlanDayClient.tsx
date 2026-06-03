"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DayAnchorRow, DoctorRow, FacilityRow, PlannedStop } from "@/lib/types";
import { DayAnchorsPanel } from "./DayAnchorsPanel";
import { MonthAnchorCalendar } from "./MonthAnchorCalendar";
import { PlanControls } from "./PlanControls";
import { StopCard } from "./StopCard";
import { SuggestedProspects } from "./SuggestedProspects";

type AnchorKind = "lunch" | "coffee" | "fitting";

export function PlanDayClient({
  planDate,
  stops,
  suggestions,
  doctors,
  facilities,
  anchors,
  prospectCount: initialCount,
  monthSummary,
}: {
  planDate: string;
  stops: PlannedStop[];
  suggestions: PlannedStop[];
  doctors: DoctorRow[];
  facilities: FacilityRow[];
  anchors: DayAnchorRow[];
  prospectCount: number;
  monthSummary: Record<string, AnchorKind[]>;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [saving, setSaving] = useState(false);

  async function saveSuggestedCount(next: number) {
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
      alert("Could not save suggestion count.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4 space-y-3">
        <PlanControls planDate={planDate} />
        <label className="block text-sm text-violet-800 dark:text-slate-400">
          Suggested visits to show
          <select
            value={count}
            disabled={saving}
            onChange={(e) => saveSuggestedCount(parseInt(e.target.value, 10))}
            className="ml-2 rounded border px-2 py-1 text-sm"
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-violet-700 dark:text-slate-400">
          Anchors and lunches appear on your plan automatically. Add visit stops
          from Suggested below or from Doctors → Add to plan.
        </p>
      </section>

      <DayAnchorsPanel
        anchors={anchors}
        doctors={doctors}
        facilities={facilities}
        planDate={planDate}
      />

      {stops.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-violet-950 dark:text-slate-100">
            Your plan
          </h2>
          <ol className="space-y-3">
            {stops.map((stop, index) => (
              <li key={`${stop.kind}-${stop.doctorId}-${stop.anchorId ?? index}`}>
                <StopCard stop={stop} planDate={planDate} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <MonthAnchorCalendar planDate={planDate} summary={monthSummary} />

      <SuggestedProspects planDate={planDate} suggestions={suggestions} />
    </>
  );
}
