"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OverrideVisitDateForm({
  doctorId,
  doctorName,
  currentDate,
  isOverridden,
}: {
  doctorId: string;
  doctorName: string;
  currentDate?: string | null;
  isOverridden?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(currentDate?.slice(0, 10) ?? "");
  const [loading, setLoading] = useState(false);

  async function saveOverride() {
    const warning = isOverridden
      ? `Replace the manual last-visit date for ${doctorName}? Days since visit will recalculate from the new date.`
      : `Override ${doctorName}'s last visit date? Days since visit will be calculated from this date instead of logged visits.`;
    if (!window.confirm(warning)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/visit-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualLastVisitDate: date || null }),
      });
      if (!res.ok) throw new Error("Failed to save override");
      setOpen(false);
      router.refresh();
    } catch {
      alert("Could not save date override.");
    } finally {
      setLoading(false);
    }
  }

  async function clearOverride() {
    if (!window.confirm(`Clear manual last-visit override for ${doctorName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/visit-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualLastVisitDate: null }),
      });
      if (!res.ok) throw new Error("Failed to clear override");
      setOpen(false);
      router.refresh();
    } catch {
      alert("Could not clear date override.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline"
        >
          Change last visit date
          {isOverridden && (
            <span className="ml-1 text-amber-600">(override active)</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs text-amber-900">
        This changes days-since calculations for planning. Logged visit history is not deleted.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-amber-300 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
        />
        <button
          type="button"
          disabled={loading}
          onClick={saveOverride}
          className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
        {isOverridden && (
          <button
            type="button"
            disabled={loading}
            onClick={clearOverride}
            className="rounded border border-amber-300 px-3 py-1.5 text-xs text-amber-900 disabled:opacity-50"
          >
            Clear override
          </button>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
