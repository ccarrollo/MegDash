"use client";

import type { PlannedStop } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StopTimeEditor({
  stop,
  planDate,
  compact = false,
  onDone,
}: {
  stop: PlannedStop;
  planDate: string;
  compact?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [start, setStart] = useState(stop.suggestedStartTime ?? "08:30");
  const [end, setEnd] = useState(stop.suggestedEndTime ?? "09:15");

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/plan/stop-times", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          doctorId: stop.doctorId,
          stopKind: stop.kind,
          startTime: start,
          endTime: end,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
      onDone?.();
    } catch {
      alert("Could not save time.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTime() {
    if (
      !confirm("Remove the specific time for this stop? It will stay on the plan without a time.")
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/plan/stop-times", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          doctorId: stop.doctorId,
          stopKind: stop.kind,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
      onDone?.();
    } catch {
      alert("Could not remove time.");
    } finally {
      setSaving(false);
    }
  }

  const hasSavedTime = Boolean(stop.suggestedStartTime);

  return (
    <div className={`${compact ? "mt-2" : "mt-2"} rounded-lg bg-slate-50 dark:bg-slate-800 p-2`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          disabled={saving}
          className="rounded border px-2 py-1 text-sm"
          aria-label="Start time"
        />
        <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">to</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          disabled={saving}
          className="rounded border px-2 py-1 text-sm"
          aria-label="End time"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded bg-slate-700 px-2 py-1 text-xs text-white disabled:opacity-50"
        >
          {saving ? "…" : "Save"}
        </button>
        {hasSavedTime && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void removeTime()}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Remove time
          </button>
        )}
      </div>
    </div>
  );
}
