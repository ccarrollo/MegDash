"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlannedStop } from "@/lib/types";
import { ZONE_LABELS } from "@/lib/zones";

const kindLabels: Record<PlannedStop["kind"], string> = {
  lunch: "Lunch",
  coffee: "Coffee",
  office: "Office",
  fitting: "Fitting",
  visit: "Suggested visit",
  follow_up: "Suggested follow-up",
};

export function SuggestedProspects({
  planDate,
  suggestions,
}: {
  planDate: string;
  suggestions: PlannedStop[];
}) {
  const router = useRouter();
  const [addingId, setAddingId] = useState<string | null>(null);

  async function addToPlan(doctorId: string) {
    setAddingId(doctorId);
    try {
      const res = await fetch("/api/plan/manual-stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate, doctorId }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not add to plan.");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-dashed border-violet-300 bg-white/60 p-4 dark:border-slate-600 dark:bg-slate-900/60">
      <h2 className="font-semibold text-violet-950 dark:text-slate-100">
        Suggested
      </h2>
      <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
        Based on zone, contact history, and today&apos;s anchors. Add anyone you
        want — nothing is added automatically.
      </p>
      {suggestions.length === 0 ? (
        <p className="mt-3 text-sm text-violet-700 dark:text-slate-400">
          No suggestions for this day. Adjust the count above or add doctors
          from the Doctors tab.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {suggestions.map((stop) => (
            <li
              key={stop.doctorId}
              className="flex items-start justify-between gap-3 rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <Link
                    href={`/doctors/${stop.doctorId}`}
                    className="text-brand-700 hover:underline dark:text-brand-400"
                  >
                    {stop.doctorName}
                  </Link>
                  <span className="ml-2 text-xs font-normal text-violet-600 dark:text-slate-400">
                    {kindLabels[stop.kind]}
                    {stop.dayPeriod ? ` · ${stop.dayPeriod}` : ""}
                  </span>
                </p>
                <p className="text-xs text-violet-700 dark:text-slate-400">
                  {stop.facilityName} · {ZONE_LABELS[stop.zone]}
                </p>
                <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
                  {stop.reason}
                </p>
              </div>
              <button
                type="button"
                disabled={addingId === stop.doctorId}
                onClick={() => void addToPlan(stop.doctorId)}
                className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                {addingId === stop.doctorId ? "Adding…" : "Add to plan"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
