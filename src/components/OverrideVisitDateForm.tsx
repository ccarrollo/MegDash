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
  const [date, setDate] = useState(currentDate?.slice(0, 10) ?? "");
  const [loading, setLoading] = useState(false);

  async function saveOverride() {
    const warning = isOverridden
      ? `This will replace the current manual override date for ${doctorName}. Continue?`
      : `Are you sure you want to override ${doctorName}'s last visit date? Days since visit will be calculated from this date.`;
    if (!window.confirm(warning)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/visit-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualLastVisitDate: date || null }),
      });
      if (!res.ok) throw new Error("Failed to save override");
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
      router.refresh();
    } catch {
      alert("Could not clear date override.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-medium text-amber-900">
        Manual last-visit override
      </p>
      <p className="mt-1 text-xs text-amber-800">
        Warning: this changes days-since calculations for planning.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-amber-300 bg-white px-2 py-1 text-sm"
        />
        <button
          type="button"
          disabled={loading}
          onClick={saveOverride}
          className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Save override
        </button>
        {isOverridden && (
          <button
            type="button"
            disabled={loading}
            onClick={clearOverride}
            className="rounded border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 disabled:opacity-50"
          >
            Clear override
          </button>
        )}
      </div>
    </div>
  );
}
