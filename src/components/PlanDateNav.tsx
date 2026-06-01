"use client";

import { addDaysIso } from "@/lib/dateUtils";
import Link from "next/link";

export function PlanDateNav({ planDate }: { planDate: string }) {
  const prev = addDaysIso(planDate, -1);
  const next = addDaysIso(planDate, 1);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/30 bg-white px-2 py-1 shadow-sm">
      <Link
        href={`/?date=${prev}`}
        className="rounded px-2 py-1 text-sm font-medium text-brand-800 hover:bg-brand-50"
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
        className="rounded border border-violet-200 px-2 py-1 text-sm text-violet-950"
      />
      <Link
        href={`/?date=${next}`}
        className="rounded px-2 py-1 text-sm font-medium text-brand-800 hover:bg-brand-50"
      >
        Next →
      </Link>
    </div>
  );
}
