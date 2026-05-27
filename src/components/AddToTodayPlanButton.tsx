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

  if (onPlan) {
    return (
      <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 dark:text-slate-400">
        On today&apos;s plan
      </span>
    );
  }

  async function add() {
    setLoading(true);
    try {
      const res = await fetch("/api/plan/manual-stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate: todayDate, doctorId }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not add to today's plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void add()}
      className="shrink-0 rounded-lg border border-brand-500 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:bg-brand-950/40 disabled:opacity-50"
    >
      {loading ? "Adding…" : "Add to today's plan"}
    </button>
  );
}
