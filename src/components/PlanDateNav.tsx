"use client";

import { addDaysIso } from "@/lib/dateUtils";
import Link from "next/link";
export function PlanDateNav({ planDate }: { planDate: string }) {
  const prev = addDaysIso(planDate, -1);
  const next = addDaysIso(planDate, 1);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/20 bg-white dark:bg-slate-900/10 px-2 py-1">
      <Link
        href={`/?date=${prev}`}
        className="rounded px-2 py-1 text-sm text-white/90 hover:bg-white dark:bg-slate-900/10"
      >
        ← Prev
      </Link>
      <input
        type="date"
        value={planDate}
        onChange={(e) => {
          if (e.target.value) {
            window.location.href = `/?date=${e.target.value}`;
          }
        }}
        className="rounded border border-white/30 bg-white dark:bg-slate-900/10 px-2 py-1 text-sm text-white"
      />
      <Link
        href={`/?date=${next}`}
        className="rounded px-2 py-1 text-sm text-white/90 hover:bg-white dark:bg-slate-900/10"
      >
        Next →
      </Link>
    </div>
  );
}
