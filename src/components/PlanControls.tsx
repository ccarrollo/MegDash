"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isTodayPlanDate } from "@/lib/dateUtils";

export function PlanControls({
  planDate,
  autoSuggestions,
}: {
  planDate: string;
  autoSuggestions: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"clear" | "fill" | null>(null);

  async function clearPlan() {
    if (
      !confirm(
        "Clear suggested visits for this day? Lunches stay on the plan. Add doctors from the Doctors tab.",
      )
    ) {
      return;
    }
    setLoading("clear");
    try {
      const res = await fetch("/api/plan/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not clear plan.");
    } finally {
      setLoading(null);
    }
  }

  async function autoFill() {
    setLoading("fill");
    try {
      const res = await fetch("/api/plan/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not auto-fill plan.");
    } finally {
      setLoading(null);
    }
  }

  const viewingToday = isTodayPlanDate(planDate);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!autoSuggestions && (
        <p className="w-full text-xs text-amber-800 dark:text-amber-200">
          Manual plan — add stops from the Doctors tab
          {viewingToday ? "" : ` (${planDate})`}.
        </p>
      )}
      <button
        type="button"
        disabled={loading != null}
        onClick={() => void clearPlan()}
        className="rounded-lg border border-violet-300 dark:border-slate-600 bg-fuchsia-50 dark:bg-slate-900 px-3 py-1.5 text-sm text-violet-900 dark:text-slate-300 disabled:opacity-50"
      >
        {loading === "clear" ? "Clearing…" : "Clear plan"}
      </button>
      {!autoSuggestions && (
        <button
          type="button"
          disabled={loading != null}
          onClick={() => void autoFill()}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading === "fill" ? "Filling…" : "Auto-fill suggestions"}
        </button>
      )}
    </div>
  );
}
