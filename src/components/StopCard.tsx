"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTimeRange } from "@/lib/schedule";
import type { PlannedStop } from "@/lib/types";
import { ZONE_LABELS } from "@/lib/zones";
import { LogVisitForm } from "./LogVisitForm";
import { StopTimeEditor } from "./StopTimeEditor";

const kindStyles: Record<PlannedStop["kind"], string> = {
  lunch:
    "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/50 dark:text-fuchsia-200",
  coffee:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
  office:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  fitting:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
  visit: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200",
  follow_up:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
};

const kindLabels: Record<PlannedStop["kind"], string> = {
  lunch: "Lunch",
  coffee: "Coffee / AM",
  office: "Office",
  fitting: "Fitting",
  visit: "Prospect",
  follow_up: "Follow-up",
};

export function StopCard({
  stop,
  planDate,
}: {
  stop: PlannedStop;
  planDate: string;
}) {
  const router = useRouter();
  const [editingTime, setEditingTime] = useState(false);
  const [removing, setRemoving] = useState(false);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`;
  const isLunch = stop.kind === "lunch";
  const canLogVisit = !stop.isNonDoctor && stop.kind !== "fitting";
  const hasCustomTime =
    !isLunch && Boolean(stop.suggestedStartTime && stop.suggestedEndTime);

  async function removeFromPlan() {
    if (!confirm("Remove this stop from today's plan?")) return;
    setRemoving(true);
    try {
      if (stop.kind === "fitting") {
        const res = await fetch("/api/plan/fittings", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            orderId: stop.orderId,
            anchorId: stop.anchorId,
          }),
        });
        if (!res.ok) throw new Error("failed");
      } else if (stop.kind === "lunch" || stop.lunchId) {
        const res = await fetch("/api/plan/lunches", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            doctorId: stop.isNonDoctor ? undefined : stop.doctorId,
            lunchId: stop.lunchId,
          }),
        });
        if (!res.ok) throw new Error("failed");
      } else if (
        stop.anchorId &&
        !stop.anchorId.startsWith("auto-") &&
        (stop.kind === "coffee" || stop.kind === "office")
      ) {
        const res = await fetch(`/api/day-anchors/${stop.anchorId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("failed");
      } else {
        const res = await fetch("/api/plan/manual-stops", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planDate,
            doctorId: stop.doctorId,
          }),
        });
        if (!res.ok) throw new Error("failed");
      }
      router.refresh();
    } catch {
      alert("Could not remove from plan.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isLunch && stop.suggestedStartTime && stop.suggestedEndTime && (
            <p className="text-lg font-bold tabular-nums text-violet-950 dark:text-slate-100">
              {formatTimeRange(stop.suggestedStartTime, stop.suggestedEndTime)}
            </p>
          )}
          {hasCustomTime && (
            <p className="text-lg font-bold tabular-nums text-violet-950 dark:text-slate-100">
              {formatTimeRange(stop.suggestedStartTime!, stop.suggestedEndTime!)}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${kindStyles[stop.kind]}`}
            >
              {kindLabels[stop.kind]}
            </span>
            {!isLunch && hasCustomTime && (
              <button
                type="button"
                onClick={() => setEditingTime(!editingTime)}
                className="text-xs text-brand-600 hover:underline"
              >
                {editingTime ? "Done" : "Change time"}
              </button>
            )}
            {!isLunch && !hasCustomTime && !editingTime && (
              <button
                type="button"
                onClick={() => setEditingTime(true)}
                className="text-xs text-brand-600 hover:underline"
              >
                Add specific time
              </button>
            )}
            {!isLunch && !hasCustomTime && editingTime && (
              <button
                type="button"
                onClick={() => setEditingTime(false)}
                className="text-xs text-violet-700 dark:text-slate-400 hover:underline"
              >
                Cancel
              </button>
            )}
            {(stop.isManual ||
              stop.kind === "fitting" ||
              stop.kind === "lunch" ||
              stop.kind === "coffee" ||
              stop.kind === "office") && (
              <button
                type="button"
                disabled={removing}
                onClick={() => void removeFromPlan()}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Remove from plan
              </button>
            )}
          </div>
          <h2 className="mt-1 text-lg font-semibold">
            {stop.isNonDoctor ? (
              stop.doctorName
            ) : (
              <Link
                href={`/doctors/${stop.doctorId}`}
                className="hover:text-brand-600 hover:underline"
              >
                {stop.doctorName}
              </Link>
            )}
          </h2>
          <p className="text-sm text-violet-800 dark:text-slate-400">{stop.facilityName}</p>
        </div>
        <span className="shrink-0 text-xs text-violet-600 dark:text-slate-400">
          {ZONE_LABELS[stop.zone]}
        </span>
      </div>

      <p className="mt-2 text-sm text-violet-700 dark:text-slate-400">{stop.reason}</p>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-sm font-medium text-brand-600 underline-offset-2 hover:underline"
      >
        {stop.address}
      </a>

      {!isLunch && editingTime && (
        <StopTimeEditor
          stop={stop}
          planDate={planDate}
          compact
          onDone={() => setEditingTime(false)}
        />
      )}

      {canLogVisit && (
        <div className="mt-4 border-t border-violet-100 dark:border-slate-800 pt-3">
          <LogVisitForm doctorId={stop.doctorId} />
        </div>
      )}
    </article>
  );
}
