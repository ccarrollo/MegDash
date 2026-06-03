"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlanControls({ planDate }: { planDate: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function clearPlan() {
    if (
      !confirm(
        "Remove all visit stops you added for this day? Anchors and lunches stay on the plan.",
      )
    ) {
      return;
    }
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void clearPlan()}
        className="rounded-lg border border-violet-300 dark:border-slate-600 bg-fuchsia-50 dark:bg-slate-900 px-3 py-1.5 text-sm text-violet-900 dark:text-slate-300 disabled:opacity-50"
      >
        {loading ? "Clearing…" : "Clear added visits"}
      </button>
    </div>
  );
}
