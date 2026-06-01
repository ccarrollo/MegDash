"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddNewOrderForm } from "@/components/AddNewOrderForm";
import { OrderCard } from "@/components/OrderCard";
import { COMMISSION_TIERS } from "@/lib/commission";
import { isOrderClosed } from "@/lib/orders";
import type {
  MonthlyGoalRow,
  MonthlyPerformance,
  OrderRow,
  SaleRecordRow,
} from "@/lib/types";

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

function goalFieldsFromRow(goal: MonthlyGoalRow | null) {
  const accel = goal?.accel_goal ?? 0;
  const physio = goal?.physio_goal ?? 0;
  return {
    accel: accel > 0 ? String(accel) : "",
    physio: physio > 0 ? String(physio) : "",
  };
}

export function SalesOrdersClient({
  performance,
  goal,
  sales,
  orders,
  paymentsByOrderId,
  doctors,
  year,
  month,
}: {
  performance: MonthlyPerformance;
  goal: MonthlyGoalRow | null;
  sales: SaleRecordRow[];
  orders: OrderRow[];
  paymentsByOrderId: Record<string, SaleRecordRow[]>;
  doctors: { id: string; name: string; facility_name?: string | null }[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [accelGoal, setAccelGoal] = useState("");
  const [physioGoal, setPhysioGoal] = useState("");
  const [showProductGoals, setShowProductGoals] = useState(false);
  const [showClosedOrders, setShowClosedOrders] = useState(false);
  const [copyTemplate, setCopyTemplate] = useState<OrderRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fields = goalFieldsFromRow(goal);
    setAccelGoal(fields.accel);
    setPhysioGoal(fields.physio);
    setShowProductGoals(false);
  }, [goal, year, month]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#order-")) return;
    const orderId = hash.slice("#order-".length);
    const target = orders.find((o) => o.id === orderId);
    if (target && isOrderClosed(target)) {
      setShowClosedOrders(true);
    }
    const el = document.querySelector(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-brand-500");
    const timer = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-brand-500");
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [orders]);

  async function saveGoal() {
    const accel = parseFloat(accelGoal);
    const physio = parseFloat(physioGoal);
    if (!Number.isFinite(accel) || !Number.isFinite(physio)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sales/monthly-goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodYear: year,
          periodMonth: month,
          accelGoal: accel,
          physioGoal: physio,
        }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not save goal.");
    } finally {
      setSaving(false);
    }
  }

  const isQuarterEnd = month % 3 === 0;
  const tierHint = COMMISSION_TIERS.map(
    (t) => `${Math.round(t.minRatio * 100)}%+ → ${t.rate}%`,
  ).join(", ");
  const hasGoals = performance.goalTotal > 0;
  const openOrders = orders.filter((o) => !isOrderClosed(o));
  const closedOrders = orders.filter((o) => isOrderClosed(o));

  return (
    <>
      <section className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/30 p-4">
        <h2 className="font-semibold">
          Goals — {MONTH_NAMES[month - 1]} {year}
        </h2>
        <p className="mt-1 text-xs text-violet-800 dark:text-slate-400">
          Goals are saved per month. Sales, percent of goal, commission rate, and
          commission dollars are calculated automatically from paid 3PP sales in
          the database (not copied from the sheet).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-fuchsia-50 dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50 sm:col-span-2">
            <p className="text-xs text-violet-700 dark:text-slate-400">Total 3PP goal</p>
            <p className="text-xl font-bold">{money(performance.goalTotal)}</p>
            <button
              type="button"
              onClick={() => setShowProductGoals((v) => !v)}
              className="mt-2 text-xs text-brand-600 hover:underline"
              aria-expanded={showProductGoals}
            >
              {showProductGoals
                ? "Hide AS and PS goals"
                : "Show AS and PS goals"}
            </button>
            {showProductGoals && (
              <div className="mt-3 grid gap-3 border-t border-violet-100 dark:border-slate-800 pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-violet-700 dark:text-slate-400">
                    AccelStim goal (this month)
                  </p>
                  <input
                    type="number"
                    value={accelGoal}
                    onChange={(e) => setAccelGoal(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-lg font-bold"
                  />
                </div>
                <div>
                  <p className="text-xs text-violet-700 dark:text-slate-400">
                    PhysioStim goal (this month)
                  </p>
                  <input
                    type="number"
                    value={physioGoal}
                    onChange={(e) => setPhysioGoal(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-lg font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveGoal}
                    className="rounded bg-brand-600 px-3 py-1 text-xs text-white"
                  >
                    Save goals for {MONTH_NAMES[month - 1]}
                  </button>
                </div>
              </div>
            )}
            {!goal && (
              <p className="mt-2 text-xs text-amber-700">
                No goals saved for this month yet — open AS and PS goals to set
                them.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-fuchsia-50 dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
            <p className="text-xs text-violet-700 dark:text-slate-400">
              3PP sales (paid, My Sales $)
              <span className="ml-1 text-brand-600">· calculated</span>
            </p>
            <p className="text-2xl font-bold">{money(performance.sales3pp)}</p>
            <p className="text-xs text-violet-700 dark:text-slate-400">
              AS {money(performance.accelSales)} · PS{" "}
              {money(performance.physioSales)}
            </p>
            <p className="mt-1 text-xs text-violet-600 dark:text-slate-400">
              {sales.length} sale{sales.length === 1 ? "" : "s"} this month
            </p>
          </div>
          <div className="rounded-lg bg-fuchsia-50 dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
            <p className="text-xs text-violet-700 dark:text-slate-400">
              % of goal
              <span className="ml-1 text-brand-600">· calculated</span>
            </p>
            <p className="text-2xl font-bold">
              {hasGoals ? `${performance.pctOfGoal}%` : "—"}
            </p>
            {hasGoals && performance.dollarsToGoal > 0 && (
              <p className="text-xs text-violet-700 dark:text-slate-400">
                {money(performance.dollarsToGoal)} to goal
              </p>
            )}
          </div>
          <div className="rounded-lg bg-fuchsia-50 dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
            <p className="text-xs text-violet-700 dark:text-slate-400">
              Commission rate
              <span className="ml-1 text-brand-600">· calculated</span>
            </p>
            <p className="text-2xl font-bold">
              {hasGoals ? `${performance.commissionRate}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">{tierHint}</p>
          </div>
          <div className="rounded-lg bg-fuchsia-50 dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
            <p className="text-xs text-violet-700 dark:text-slate-400">
              3PP commission (this month)
              <span className="ml-1 text-brand-600">· calculated</span>
            </p>
            <p className="text-2xl font-bold">
              {hasGoals ? money(performance.commission3pp) : "—"}
            </p>
          </div>
          {(isQuarterEnd || month === 12) && (
            <div className="rounded-lg bg-fuchsia-50 dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
              <p className="text-xs text-violet-700 dark:text-slate-400">
                True up / down
                <span className="ml-1 text-brand-600">· calculated</span>
                {month === 12
                  ? " · calendar year-end"
                  : " · calendar quarter-end"}
              </p>
              <p
                className={`text-2xl font-bold ${
                  (performance.trueUp ?? 0) < 0
                    ? "text-red-600"
                    : (performance.trueUp ?? 0) > 0
                      ? "text-emerald-700"
                      : "text-violet-800 dark:text-slate-400"
                }`}
              >
                {!hasGoals
                  ? "—"
                  : performance.trueUp == null || performance.trueUp === 0
                    ? "$0"
                    : `${performance.trueUp < 0 ? "−" : "+"}${money(Math.abs(performance.trueUp))}`}
              </p>
            </div>
          )}
        </div>

        <p className="mt-3 text-sm font-medium text-violet-950 dark:text-slate-200">
          Est. 3PP commission (monthly + true-up):{" "}
          {hasGoals ? money(performance.commissionPay) : "—"}
        </p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-fuchsia-50 dark:bg-slate-900">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{
              width: `${hasGoals ? Math.min(100, performance.pctOfGoal) : 0}%`,
            }}
          />
        </div>
      </section>

      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-violet-50/70 dark:bg-slate-800 p-4 text-sm text-violet-900 dark:text-slate-300">
        <h3 className="font-semibold text-violet-950 dark:text-slate-100">How numbers stay up to date</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>
            <strong>Goals</strong> — total 3PP goal is shown by default; expand
            AS/PS to edit per month (or re-import from the sheet).
          </li>
          <li>
            <strong>3PP sales</strong> — record payments on each order when
            insurance or patient money is received (including monthly plan
            installments).
          </li>
          <li>
            <strong>% of goal, rate, commission</strong> — recomputed on every
            page load from goals + paid sales (tier rules match your sheet).
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Orders</h2>
        <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
          Add orders here only — not from visit log. Record insurance and patient
          payments as they arrive to hit monthly goals.
        </p>
        <div className="mt-3">
          <AddNewOrderForm
            key={copyTemplate?.id ?? "new-order"}
            doctors={doctors}
            templateFrom={copyTemplate}
            onClearTemplate={() => setCopyTemplate(null)}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-violet-700 dark:text-slate-400">
            Open pipeline: {openOrders.length} · Closed: {closedOrders.length}
          </p>
          <button
            type="button"
            onClick={() => setShowClosedOrders((v) => !v)}
            className="text-xs text-brand-600 hover:underline"
          >
            {showClosedOrders ? "Hide closed orders" : "Show closed orders"}
          </button>
        </div>
        {openOrders.length === 0 ? (
          <p className="mt-2 text-sm text-violet-700 dark:text-slate-400">
            No open orders. Use + Add New Order above.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {openOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                payments={paymentsByOrderId[o.id] ?? []}
                viewYear={year}
                viewMonth={month}
                saving={saving}
                onSavingChange={setSaving}
                onCopyTemplate={(order) => {
                  setCopyTemplate(order);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ))}
          </ul>
        )}
        {showClosedOrders && closedOrders.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-violet-700 dark:text-slate-400">
              Closed orders
            </p>
            <ul className="mt-2 space-y-3">
              {closedOrders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  payments={paymentsByOrderId[o.id] ?? []}
                  viewYear={year}
                  viewMonth={month}
                  saving={saving}
                  onSavingChange={setSaving}
                  onCopyTemplate={(order) => {
                    setCopyTemplate(order);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

    </>
  );
}
