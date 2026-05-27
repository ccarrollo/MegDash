"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddPaidSaleForm } from "@/components/AddPaidSaleForm";
import { PaidSaleRow } from "@/components/PaidSaleRow";
import { COMMISSION_TIERS } from "@/lib/commission";
import type {
  MonthlyGoalRow,
  MonthlyPerformance,
  OrderRow,
  SaleRecordRow,
} from "@/lib/types";

const PIPELINE_LABELS: Record<string, string> = {
  order_received: "Order received",
  insurance_review: "Insurance review",
  fitted: "Fitted patient",
  paid: "Paid / counts as sale",
  lost: "Lost / declined",
};

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
  doctors,
  year,
  month,
}: {
  performance: MonthlyPerformance;
  goal: MonthlyGoalRow | null;
  sales: SaleRecordRow[];
  orders: OrderRow[];
  doctors: { id: string; name: string; facility_name?: string | null }[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [accelGoal, setAccelGoal] = useState("");
  const [physioGoal, setPhysioGoal] = useState("");
  const [showProductGoals, setShowProductGoals] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fields = goalFieldsFromRow(goal);
    setAccelGoal(fields.accel);
    setPhysioGoal(fields.physio);
    setShowProductGoals(false);
  }, [goal, year, month]);

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

  async function updateOrder(
    orderId: string,
    patch: Record<string, unknown>,
  ) {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not update order.");
    } finally {
      setSaving(false);
    }
  }

  const isQuarterEnd = month % 3 === 0;
  const tierHint = COMMISSION_TIERS.map(
    (t) => `${Math.round(t.minRatio * 100)}%+ → ${t.rate}%`,
  ).join(", ");
  const hasGoals = performance.goalTotal > 0;

  return (
    <>
      <section className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-950/30 p-4">
        <h2 className="font-semibold">
          Goals — {MONTH_NAMES[month - 1]} {year}
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">
          Goals are saved per month. Sales, percent of goal, commission rate, and
          commission dollars are calculated automatically from paid 3PP sales in
          the database (not copied from the sheet).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50 sm:col-span-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Total 3PP goal</p>
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
              <div className="mt-3 grid gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
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

          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
              3PP sales (paid, My Sales $)
              <span className="ml-1 text-brand-600">· calculated</span>
            </p>
            <p className="text-2xl font-bold">{money(performance.sales3pp)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
              AS {money(performance.accelSales)} · PS{" "}
              {money(performance.physioSales)}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
              {sales.length} sale{sales.length === 1 ? "" : "s"} this month
            </p>
          </div>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
              % of goal
              <span className="ml-1 text-brand-600">· calculated</span>
            </p>
            <p className="text-2xl font-bold">
              {hasGoals ? `${performance.pctOfGoal}%` : "—"}
            </p>
            {hasGoals && performance.dollarsToGoal > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                {money(performance.dollarsToGoal)} to goal
              </p>
            )}
          </div>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
              Commission rate
              <span className="ml-1 text-brand-600">· calculated</span>
            </p>
            <p className="text-2xl font-bold">
              {hasGoals ? `${performance.commissionRate}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{tierHint}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
              3PP commission (this month)
              <span className="ml-1 text-brand-600">· calculated</span>
            </p>
            <p className="text-2xl font-bold">
              {hasGoals ? money(performance.commission3pp) : "—"}
            </p>
          </div>
          {(isQuarterEnd || month === 12) && (
            <div className="rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
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
                      : "text-slate-600 dark:text-slate-400 dark:text-slate-400"
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

        <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
          Est. 3PP commission (monthly + true-up):{" "}
          {hasGoals ? money(performance.commissionPay) : "—"}
        </p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white dark:bg-slate-900">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{
              width: `${hasGoals ? Math.min(100, performance.pctOfGoal) : 0}%`,
            }}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-700 dark:text-slate-300">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">How numbers stay up to date</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>
            <strong>Goals</strong> — total 3PP goal is shown by default; expand
            AS/PS to edit per month (or re-import from the sheet).
          </li>
          <li>
            <strong>3PP sales</strong> — add when an order is marked{" "}
            <strong>Paid</strong> with My Sales $, use <strong>+ Add paid sale</strong>,
            edit an existing row, or import from the Sales tab CSV.
          </li>
          <li>
            <strong>% of goal, rate, commission</strong> — recomputed on every
            page load from goals + paid sales (tier rules match your sheet).
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Order pipeline</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
          Order → insurance → fit → paid. Enter My Sales $ when marking paid ($0
          for comp/giveaway).
        </p>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
            No orders yet. Log &quot;Order obtained&quot; on a doctor.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-sm"
              >
                <p className="font-medium">
                  {o.doctor_name ?? "Doctor"}
                  {o.patient_label && (
                    <span className="font-normal text-slate-500 dark:text-slate-400 dark:text-slate-400">
                      {" "}
                      · {o.patient_label}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                  {new Date(o.ordered_at).toLocaleDateString()} ·{" "}
                  {o.facility_name}
                </p>
                <select
                  value={o.pipeline_stage ?? "order_received"}
                  disabled={saving}
                  onChange={(e) =>
                    updateOrder(o.id, { pipelineStage: e.target.value })
                  }
                  className="mt-2 w-full rounded border px-2 py-1 text-xs"
                >
                  {Object.entries(PIPELINE_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="mt-2 block text-xs">
                  <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400">My Sales $ (per order)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Required when paid — 0 if comp"
                    defaultValue={o.my_sales_amount ?? o.amount ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      updateOrder(o.id, {
                        mySalesAmount: v === "" ? 0 : parseFloat(v),
                        channel: "3pp",
                      });
                    }}
                    className="mt-1 w-full rounded border px-2 py-1 text-xs"
                  />
                </label>
                {(o.pipeline_stage === "fitted" ||
                  o.pipeline_stage === "paid") && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Payment year"
                      defaultValue={o.payment_year ?? year}
                      onBlur={(e) => {
                        const y = parseInt(e.target.value, 10);
                        const m = o.payment_month ?? month;
                        if (y && m) {
                          updateOrder(o.id, {
                            paymentYear: y,
                            paymentMonth: m,
                            recordSale: o.pipeline_stage === "paid",
                            mySalesAmount:
                              o.my_sales_amount ?? o.amount ?? 0,
                          });
                        }
                      }}
                      className="rounded border px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      placeholder="Payment month"
                      defaultValue={o.payment_month ?? month}
                      onBlur={(e) => {
                        const m = parseInt(e.target.value, 10);
                        const y = o.payment_year ?? year;
                        if (y && m) {
                          updateOrder(o.id, {
                            paymentYear: y,
                            paymentMonth: m,
                            recordSale: o.pipeline_stage === "paid",
                            mySalesAmount:
                              o.my_sales_amount ?? o.amount ?? 0,
                          });
                        }
                      }}
                      className="rounded border px-2 py-1 text-xs"
                    />
                  </div>
                )}
                {o.doctor_id && (
                  <Link
                    href={`/doctors/${o.doctor_id}`}
                    className="mt-2 inline-block text-xs text-brand-600 hover:underline"
                  >
                    Open doctor
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Paid sales ({sales.length})</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
          These rows drive 3PP sales and commission for {MONTH_NAMES[month - 1]}{" "}
          {year}. Tap Edit on any sale to change My Sales $, payment month, or
          other details.
        </p>
        <div className="mt-3">
          <AddPaidSaleForm year={year} month={month} doctors={doctors} />
        </div>
        {sales.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
            No paid sales for {MONTH_NAMES[month - 1]} {year} yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sales.map((s) => (
              <PaidSaleRow key={s.id} sale={s} doctors={doctors} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
