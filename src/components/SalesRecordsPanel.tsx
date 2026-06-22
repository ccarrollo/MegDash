"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { paymentAmount } from "@/lib/orders";
import type { SaleRecordRow } from "@/lib/types";

const MONTH_NAMES = [
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

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function channelLabel(channel: string | null | undefined) {
  return channel === "wholesale" ? "Wholesale" : "3PP";
}

function SaleRow({ sale, showPaymentMonth }: { sale: SaleRecordRow; showPaymentMonth: boolean }) {
  const amount = paymentAmount(sale);
  const label = sale.patient_label?.trim() || "Patient";
  const doctor = sale.doctor_name?.trim();
  const facility = sale.facility_name?.trim();

  return (
    <li className="rounded-lg border border-violet-200 bg-fuchsia-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          {(doctor || facility) && (
            <p className="truncate text-xs text-violet-700 dark:text-slate-400">
              {doctor}
              {doctor && facility ? " · " : ""}
              {facility}
            </p>
          )}
          <p className="mt-1 text-xs text-violet-600 dark:text-slate-500">
            {showPaymentMonth && (
              <>
                {MONTH_NAMES[sale.payment_month - 1]} {sale.payment_year} ·{" "}
              </>
            )}
            {channelLabel(sale.channel)}
            {sale.product ? ` · ${sale.product}` : ""}
            {sale.payment_source === "insurance"
              ? " · Insurance"
              : sale.payment_source === "patient"
                ? " · Patient"
                : ""}
          </p>
        </div>
        <p className="shrink-0 font-semibold tabular-nums">{money(amount)}</p>
      </div>
      {sale.order_id && (
        <Link
          href={`/sales#order-${sale.order_id}`}
          className="mt-1 inline-block text-xs text-brand-600 hover:underline"
        >
          View order →
        </Link>
      )}
    </li>
  );
}

export function SalesRecordsPanel({
  title,
  sales,
  emptyMessage,
  showPaymentMonth = false,
  defaultExpanded = true,
  collapsible = false,
}: {
  title: string;
  sales: SaleRecordRow[];
  emptyMessage: string;
  showPaymentMonth?: boolean;
  defaultExpanded?: boolean;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const total = useMemo(
    () => sales.reduce((sum, s) => sum + paymentAmount(s), 0),
    [sales],
  );

  const grouped = useMemo(() => {
    if (!showPaymentMonth) return null;
    const map = new Map<string, SaleRecordRow[]>();
    for (const sale of sales) {
      const key = `${sale.payment_year}-${String(sale.payment_month).padStart(2, "0")}`;
      const list = map.get(key) ?? [];
      list.push(sale);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sales, showPaymentMonth]);

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-violet-700 dark:text-slate-400">
          {sales.length} payment{sales.length === 1 ? "" : "s"} · {money(total)} total
        </p>
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-brand-600 hover:underline"
        >
          {expanded ? "Hide" : "Show"}
        </button>
      )}
    </div>
  );

  if (!expanded && collapsible) {
    return (
      <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        {header}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      {header}
      {sales.length === 0 ? (
        <p className="mt-3 text-sm text-violet-700 dark:text-slate-400">{emptyMessage}</p>
      ) : showPaymentMonth && grouped ? (
        <div className="mt-3 space-y-4">
          {grouped.map(([key, monthSales]) => {
            const [y, m] = key.split("-");
            const monthTotal = monthSales.reduce(
              (sum, s) => sum + paymentAmount(s),
              0,
            );
            return (
              <div key={key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
                  {MONTH_NAMES[parseInt(m, 10) - 1]} {y} · {money(monthTotal)}
                </p>
                <ul className="mt-2 space-y-2">
                  {monthSales.map((sale) => (
                    <SaleRow key={sale.id} sale={sale} showPaymentMonth={false} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {sales.map((sale) => (
            <SaleRow key={sale.id} sale={sale} showPaymentMonth={showPaymentMonth} />
          ))}
        </ul>
      )}
    </section>
  );
}
