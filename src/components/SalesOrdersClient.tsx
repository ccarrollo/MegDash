"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddNewOrderForm } from "@/components/AddNewOrderForm";
import { OrderCard } from "@/components/OrderCard";
import { SalesRecordsPanel } from "@/components/SalesRecordsPanel";
import { COMMISSION_TIERS, WHOLESALE_COMMISSION_PCT } from "@/lib/commission";
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
  const wholesale = goal?.wholesale_sales ?? 0;
  return {
    accel: accel > 0 ? String(accel) : "",
    physio: physio > 0 ? String(physio) : "",
    wholesale: wholesale > 0 ? String(wholesale) : "",
  };
}

export function SalesOrdersClient({
  performance,
  goal,
  sales,
  allSales,
  orders,
  paymentsByOrderId,
  doctors,
  year,
  month,
}: {
  performance: MonthlyPerformance;
  goal: MonthlyGoalRow | null;
  sales: SaleRecordRow[];
  allSales: SaleRecordRow[];
  orders: OrderRow[];
  paymentsByOrderId: Record<string, SaleRecordRow[]>;
  doctors: { id: string; name: string; facility_name?: string | null }[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [accelGoal, setAccelGoal] = useState("");
  const [physioGoal, setPhysioGoal] = useState("");
  const [wholesaleAmount, setWholesaleAmount] = useState("");
  const [showProductGoals, setShowProductGoals] = useState(false);
  const [showClosedOrders, setShowClosedOrders] = useState(false);
  const [copyTemplate, setCopyTemplate] = useState<OrderRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fields = goalFieldsFromRow(goal);
    setAccelGoal(fields.accel);
    setPhysioGoal(fields.physio);
    setWholesaleAmount(fields.wholesale);
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

  async function saveProductGoals() {
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

  async function saveWholesaleAmount() {
    const wholesale = parseFloat(wholesaleAmount);
    setSaving(true);
    try {
      const res = await fetch("/api/sales/monthly-goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodYear: year,
          periodMonth: month,
          wholesaleSales: Number.isFinite(wholesale) ? wholesale : 0,
        }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not save wholesale amount.");
    } finally {
      setSaving(false);
    }
  }

  const isQuarterEnd = month % 3 === 0;
  const tierHint = COMMISSION_TIERS.map(
    (t) => `${Math.round(t.minRatio * 100)}%+ → ${t.rate}%`,
  ).join(", ");
  const hasGoals = performance.goalTotal > 0;
  const hasWholesale = performance.wholesaleSales > 0;
  const commission3ppWithTrueUp = useMemo(
    () => performance.commission3pp + (performance.trueUp ?? 0),
    [performance.commission3pp, performance.trueUp],
  );
  const openOrders = orders.filter((o) => !isOrderClosed(o));
  const closedOrders = orders.filter((o) => isOrderClosed(o));

  return (
    <>
      <section className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/30 p-4">
        <h2 className="font-semibold">
          Goals — {MONTH_NAMES[month - 1]} {year}
        </h2>
        <p className="mt-1 text-xs text-violet-800 dark:text-slate-400">
          3PP goals drive tier rate and true-up. Wholesale pays a flat{" "}
          {WHOLESALE_COMMISSION_PCT}% commission — not tied to 3PP goals. Total
          commission = 3PP (plus true-up) + wholesale.
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
                    onClick={() => void saveProductGoals()}
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
          <div className="rounded-lg bg-fuchsia-50 dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50 sm:col-span-2">
            <p className="text-xs text-violet-700 dark:text-slate-400">
              Wholesale sales (My Sales $)
              <span className="ml-1 text-brand-600">· {WHOLESALE_COMMISSION_PCT}% commission</span>
            </p>
            <p className="text-2xl font-bold">{money(performance.wholesaleSales)}</p>
            <p className="text-xs text-violet-700 dark:text-slate-400">
              {performance.wholesaleFromRecords > 0 && (
                <>
                  From wholesale orders: {money(performance.wholesaleFromRecords)}
                  {performance.wholesaleManual > 0 ? " · " : ""}
                </>
              )}
              {performance.wholesaleManual > 0 && (
                <>Manual entry: {money(performance.wholesaleManual)}</>
              )}
              {!hasWholesale && "No wholesale sales this month yet"}
            </p>
            <label className="mt-2 block text-xs text-violet-700 dark:text-slate-400">
              Additional wholesale $ (manual)
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={wholesaleAmount}
                  onChange={(e) => setWholesaleAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded border px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveWholesaleAmount()}
                  className="shrink-0 rounded bg-brand-600 px-2 py-1 text-xs text-white"
                >
                  Save
                </button>
              </div>
            </label>
            <p className="mt-1 text-[10px] text-violet-600 dark:text-slate-500">
              Paid wholesale orders count automatically. Add manual $ for anything
              not on an order.
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

        <div className="mt-4 space-y-2 rounded-lg border border-brand-200/60 bg-fuchsia-50/80 p-3 dark:border-brand-900 dark:bg-slate-900/80">
          <p className="text-sm font-semibold text-violet-950 dark:text-slate-100">
            Estimated commission — {MONTH_NAMES[month - 1]}
          </p>
          <div className="grid gap-1 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-violet-700 dark:text-slate-400">
                3PP commission (monthly)
              </span>
              <span className="font-medium">
                {hasGoals ? money(performance.commission3pp) : "—"}
              </span>
            </p>
            {(isQuarterEnd || month === 12) && (
              <p className="flex justify-between gap-4">
                <span className="text-violet-700 dark:text-slate-400">
                  True up / down
                </span>
                <span className="font-medium">
                  {!hasGoals
                    ? "—"
                    : performance.trueUp == null || performance.trueUp === 0
                      ? "$0"
                      : `${performance.trueUp < 0 ? "−" : "+"}${money(Math.abs(performance.trueUp))}`}
                </span>
              </p>
            )}
            <p className="flex justify-between gap-4">
              <span className="text-violet-700 dark:text-slate-400">
                Wholesale commission ({WHOLESALE_COMMISSION_PCT}%)
              </span>
              <span className="font-medium">
                {hasWholesale ? money(performance.wholesalePayout) : "—"}
              </span>
            </p>
            <p className="flex justify-between gap-4 border-t border-violet-200 pt-2 font-semibold dark:border-slate-700">
              <span>Total commission</span>
              <span>
                {hasGoals || hasWholesale ? money(performance.commissionPay) : "—"}
              </span>
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-violet-700 dark:text-slate-400">
          3PP subtotal (monthly + true-up):{" "}
          {hasGoals ? money(commission3ppWithTrueUp) : "—"}
          {hasWholesale && hasGoals ? " · " : ""}
          {hasWholesale && !hasGoals ? "" : null}
          {hasWholesale && `Wholesale: ${money(performance.wholesalePayout)}`}
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

      <SalesRecordsPanel
        title={`Sales — ${MONTH_NAMES[month - 1]} ${year}`}
        sales={sales}
        emptyMessage="No payments recorded for this month yet. Record payments on orders below — they count toward this month when you pick that payment month."
      />

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
            <strong>Wholesale</strong> — mark orders as Wholesale and record
            payments, or enter additional wholesale $ manually. Pays{" "}
            {WHOLESALE_COMMISSION_PCT}% regardless of 3PP goal tier.
          </li>
          <li>
            <strong>% of goal, 3PP rate, commissions</strong> — recomputed on
            every page load from goals + paid sales.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Orders pipeline</h2>
        <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
          All open and closed orders — not filtered by month. Record payments here;
          choose the payment month so they appear in that month&apos;s sales above.
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

      <SalesRecordsPanel
        title="All sales history"
        sales={allSales}
        showPaymentMonth
        collapsible
        defaultExpanded={false}
        emptyMessage="No sales recorded yet."
      />

    </>
  );
}
