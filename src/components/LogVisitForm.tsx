"use client";

import { VISIT_OUTCOMES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function LogVisitForm({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState("visited_success");

  const selected = useMemo(
    () => VISIT_OUTCOMES.find((o) => o.value === outcome),
    [outcome],
  );

  async function log() {
    setLoading(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, outcome }),
      });
      const data = (await res.json()) as {
        createdOrder?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.createdOrder) {
        alert("Order logged — check Sales & Orders tab.");
      }
      router.refresh();
    } catch {
      alert("Could not log visit. Is Supabase connected?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-2 text-sm"
        >
          {VISIT_OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={loading}
          onClick={log}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
      </div>
      {selected && (
        <p
          className={`mt-2 text-xs ${
            selected.updatesLastVisit
              ? "text-slate-500 dark:text-slate-400"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {selected.updatesLastVisit
            ? "Updates days since last visit."
            : outcome === "order_obtained"
              ? "Creates a pending order on Sales & Orders — does not change visit recency."
              : "Logged for history only — does not change days since last visit."}
        </p>
      )}
    </div>
  );
}
