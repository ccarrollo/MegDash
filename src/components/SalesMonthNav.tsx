"use client";

import Link from "next/link";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function SalesMonthNav({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const prev =
    month === 1
      ? { year: year - 1, month: 12 }
      : { year, month: month - 1 };
  const next =
    month === 12
      ? { year: year + 1, month: 1 }
      : { year, month: month + 1 };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 px-3 py-2">
      <Link
        href={`/sales?year=${prev.year}&month=${prev.month}`}
        className="text-sm text-brand-600 hover:underline"
      >
        ← {MONTHS[prev.month - 1]}
      </Link>
      <span className="text-sm font-semibold">
        {MONTHS[month - 1]} {year}
      </span>
      <Link
        href={`/sales?year=${next.year}&month=${next.month}`}
        className="text-sm text-brand-600 hover:underline"
      >
        {MONTHS[next.month - 1]} →
      </Link>
    </div>
  );
}
