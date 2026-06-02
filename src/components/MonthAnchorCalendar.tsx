"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { addMonthsIso, formatMonthYear } from "@/lib/dateUtils";

type AnchorKind = "lunch" | "coffee" | "fitting";

const KIND_COLORS: Record<AnchorKind, string> = {
  lunch: "bg-green-500",
  coffee: "bg-orange-500",
  fitting: "bg-purple-500",
};

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function MonthAnchorCalendar({
  planDate,
  summary,
}: {
  planDate: string;
  summary: Record<string, AnchorKind[]>;
}) {
  const router = useRouter();
  const monthPickerId = useId();
  const [year, month] = planDate.split("-").map(Number);
  const totalDays = daysInMonth(year, month);
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, day });
  }

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const prevMonth = addMonthsIso(monthStart, -1);
  const nextMonth = addMonthsIso(monthStart, 1);
  const monthValue = `${year}-${String(month).padStart(2, "0")}`;

  function goToMonth(isoFirstOfMonth: string) {
    router.push(`/?date=${isoFirstOfMonth}`);
  }

  return (
    <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToMonth(prevMonth)}
          className="rounded-lg border border-violet-300 bg-white px-2 py-1 text-sm font-medium text-violet-900 hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          aria-label="Previous month"
        >
          ←
        </button>
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById(monthPickerId) as HTMLInputElement | null;
              el?.showPicker?.();
            }}
            className="font-semibold text-violet-950 hover:text-brand-700 hover:underline dark:text-slate-100"
          >
            {formatMonthYear(monthStart)}
          </button>
          <input
            id={monthPickerId}
            type="month"
            value={monthValue}
            onChange={(e) => {
              if (!e.target.value) return;
              goToMonth(`${e.target.value}-01`);
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
        </div>
        <button
          type="button"
          onClick={() => goToMonth(nextMonth)}
          className="rounded-lg border border-violet-300 bg-white px-2 py-1 text-sm font-medium text-violet-900 hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          aria-label="Next month"
        >
          →
        </button>
      </div>
      <p className="mt-2 text-xs text-violet-700 dark:text-slate-400">
        Green lunch · Orange coffee · Purple fitting · Tap month to jump
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] text-violet-700 dark:text-slate-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`blank-${idx}`} className="h-14 rounded border border-transparent" />;
          }
          const kinds = summary[cell.date] ?? [];
          const isSelected = cell.date === planDate;
          return (
            <Link
              key={cell.date}
              href={`/?date=${cell.date}`}
              className={`relative h-14 rounded border p-1 ${
                isSelected
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-400 dark:bg-brand-950/40"
                  : "border-violet-200 bg-white/70 dark:border-slate-700 dark:bg-slate-800"
              }`}
            >
              <div className="text-xs font-medium text-violet-900 dark:text-slate-200">
                {cell.day}
              </div>
              {kinds.length > 0 && (
                <div className="absolute left-1 right-1 bottom-1 flex gap-0.5">
                  {kinds.slice(0, 3).map((kind) => (
                    <span
                      key={kind}
                      className={`h-2 flex-1 rounded-sm ${KIND_COLORS[kind]}`}
                    />
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
