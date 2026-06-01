"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddToTodayPlanButton({
  doctorId,
  todayDate,
  onPlan,
}: {
  doctorId: string;
  todayDate: string;
  onPlan: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [planDate, setPlanDate] = useState(todayDate);

  async function add() {
    setLoading(true);
    try {
      const res = await fetch("/api/plan/manual-stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate, doctorId }),
      });
      if (!res.ok) throw new Error("failed");
      setOpen(false);
      router.refresh();
    } catch {
      alert("Could not add to plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      {onPlan && (
        <p className="mb-1 rounded-full bg-violet-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-violet-800 dark:text-slate-400">
          On today&apos;s plan
        </p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-brand-500 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:bg-brand-950/40 disabled:opacity-50"
      >
        {loading ? "Adding…" : "Add to plan"}
      </button>
      {open && (
        <div className="mt-2 flex items-center justify-end gap-1">
          <input
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            className="rounded border border-violet-300 dark:border-slate-600 px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={loading || !planDate}
            onClick={() => void add()}
            className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
