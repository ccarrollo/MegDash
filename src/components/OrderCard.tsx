"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  expectedCollectedTotal,
  isOrderClosed,
  paymentAmount,
  sumPayments,
  sumPaymentsBySource,
} from "@/lib/orders";
import type { OrderRow, SaleRecordRow } from "@/lib/types";

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

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function datetimeLocal(value: string | null | undefined) {
  return value ? value.replace("Z", "").slice(0, 16) : "";
}

type OrderForm = {
  patientLabel: string;
  insurance: string;
  orderedAt: string;
  fittedAt: string;
  channel: "3pp" | "wholesale";
  product: "AccelStim" | "PhysioStim";
  orderTotal: string;
  insuranceExpected: string;
  patientResponsibilityTotal: string;
};

function orderToForm(o: OrderRow): OrderForm {
  return {
    patientLabel: o.patient_label ?? "",
    insurance: o.insurance ?? "",
    orderedAt: dateOnly(o.ordered_at),
    fittedAt: datetimeLocal(o.fitted_at),
    channel: o.channel === "wholesale" ? "wholesale" : "3pp",
    product: o.product === "AccelStim" ? "AccelStim" : "PhysioStim",
    orderTotal: o.order_total != null ? String(o.order_total) : "",
    insuranceExpected:
      o.insurance_expected != null ? String(o.insurance_expected) : "",
    patientResponsibilityTotal:
      o.patient_responsibility_total != null
        ? String(o.patient_responsibility_total)
        : "",
  };
}

const EXPANDED_ORDERS_KEY = "meg-field:expanded-orders";

function readExpandedOrders(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_ORDERS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistExpandedOrder(orderId: string, expanded: boolean) {
  const ids = readExpandedOrders();
  if (expanded) ids.add(orderId);
  else ids.delete(orderId);
  localStorage.setItem(EXPANDED_ORDERS_KEY, JSON.stringify([...ids]));
}

function initialExpanded(orderId: string): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hash === `#order-${orderId}`) return true;
  return readExpandedOrders().has(orderId);
}

function parseMoney(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export function OrderCard({
  order,
  payments,
  viewYear,
  viewMonth,
  saving,
  onSavingChange,
  onCopyTemplate,
}: {
  order: OrderRow;
  payments: SaleRecordRow[];
  viewYear: number;
  viewMonth: number;
  saving: boolean;
  onSavingChange: (v: boolean) => void;
  onCopyTemplate: (order: OrderRow) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(() => initialExpanded(order.id));
  const [form, setForm] = useState<OrderForm>(() => orderToForm(order));
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMonth, setPaymentMonth] = useState(
    `${viewYear}-${String(viewMonth).padStart(2, "0")}`,
  );
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentSource, setPaymentSource] = useState<"insurance" | "patient">(
    "patient",
  );

  useEffect(() => {
    setForm(orderToForm(order));
  }, [order]);

  useEffect(() => {
    if (window.location.hash === `#order-${order.id}`) {
      setExpanded(true);
      persistExpandedOrder(order.id, true);
      return;
    }
    setExpanded(readExpandedOrders().has(order.id));
  }, [order.id]);

  function toggleExpanded() {
    setExpanded((current) => {
      const next = !current;
      persistExpandedOrder(order.id, next);
      return next;
    });
  }

  const collected = sumPayments(payments);
  const collectedInsurance = sumPaymentsBySource(payments, "insurance");
  const collectedPatient = sumPaymentsBySource(payments, "patient");
  const expectedTotal = expectedCollectedTotal(order);
  const remaining = Math.max(0, expectedTotal - collected);
  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;

  async function saveOrder() {
    onSavingChange(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientLabel: form.patientLabel.trim() || null,
          insurance: form.insurance.trim() || null,
          orderedAt: form.orderedAt || null,
          fittedAt: form.fittedAt || null,
          channel: form.channel,
          product: form.product,
          orderTotal: parseMoney(form.orderTotal),
          insuranceExpected: parseMoney(form.insuranceExpected),
          patientResponsibilityTotal: parseMoney(form.patientResponsibilityTotal),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save order.");
    } finally {
      onSavingChange(false);
    }
  }

  async function setStage(stage: "lost" | "closed") {
    if (
      stage === "lost" &&
      !confirm("Mark this order as lost/declined?")
    ) {
      return;
    }
    onSavingChange(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: stage }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      alert("Could not update order status.");
    } finally {
      onSavingChange(false);
    }
  }

  async function copyOrderTemplate() {
    onCopyTemplate(order);
  }

  async function deleteOrder() {
    const paymentNote =
      payments.length > 0
        ? ` This will also remove ${payments.length} recorded payment${payments.length === 1 ? "" : "s"}.`
        : "";
    if (
      !confirm(
        `Delete this order for ${order.patient_label ?? "patient"}?${paymentNote} This cannot be undone.`,
      )
    ) {
      return;
    }
    onSavingChange(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete order.");
    } finally {
      onSavingChange(false);
    }
  }

  function prefillFromLastPayment() {
    if (!lastPayment) return;
    setPaymentAmountInput(String(paymentAmount(lastPayment)));
    setPaymentSource(
      lastPayment.payment_source === "insurance" ? "insurance" : "patient",
    );
    setPaymentMonth(
      `${lastPayment.payment_year}-${String(lastPayment.payment_month).padStart(2, "0")}`,
    );
    setShowPaymentForm(true);
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(paymentAmountInput);
    if (!Number.isFinite(amount)) {
      alert("Enter payment amount.");
      return;
    }
    const [y, m] = paymentMonth.split("-").map((v) => parseInt(v, 10));
    if (!y || !m) {
      alert("Pick payment month.");
      return;
    }

    onSavingChange(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentYear: y,
          paymentMonth: m,
          amount,
          paymentSource,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "failed");
      setPaymentAmountInput("");
      setShowPaymentForm(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not record payment.");
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <li
      id={`order-${order.id}`}
      className="scroll-mt-24 rounded-lg border border-violet-200 bg-fuchsia-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {order.patient_label ?? "Patient"}
            {order.doctor_id ? (
              <>
                {" · "}
                <Link
                  href={`/doctors/${order.doctor_id}`}
                  className="font-normal text-brand-600 hover:underline dark:text-brand-400"
                >
                  {order.doctor_name ?? "Prescriber"}
                </Link>
              </>
            ) : (
              <span className="font-normal text-violet-700 dark:text-slate-400">
                {" · "}
                {order.doctor_name ?? "Prescriber"}
              </span>
            )}
            {order.product && (
              <span className="font-normal text-violet-700 dark:text-slate-400">
                {" · "}
                {order.product}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-violet-800 dark:text-slate-300">
            Expected {money(expectedTotal)} · Collected {money(collected)}
            {remaining > 0 ? ` · Remaining ${money(remaining)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleExpanded}
          className="shrink-0 text-xs text-brand-600"
        >
          {expanded ? "Hide" : "Open"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-violet-200 pt-3 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs">
              <span className="text-violet-700">Patient</span>
              <input
                value={form.patientLabel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patientLabel: e.target.value }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs">
              <span className="text-violet-700">Payer</span>
              <input
                value={form.insurance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, insurance: e.target.value }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs">
              <span className="text-violet-700">Entered</span>
              <input
                type="date"
                value={form.orderedAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, orderedAt: e.target.value }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs">
              <span className="text-violet-700">Fitting date</span>
              <input
                type="datetime-local"
                value={form.fittedAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fittedAt: e.target.value }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs">
              <span className="text-violet-700">Channel</span>
              <select
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    channel: e.target.value as "3pp" | "wholesale",
                  }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              >
                <option value="3pp">3PP</option>
                <option value="wholesale">Wholesale</option>
              </select>
            </label>
            <label className="block text-xs">
              <span className="text-violet-700">Product</span>
              <select
                value={form.product}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    product: e.target.value as "AccelStim" | "PhysioStim",
                  }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              >
                <option value="AccelStim">AccelStim</option>
                <option value="PhysioStim">PhysioStim</option>
              </select>
            </label>
            <label className="block text-xs">
              <span className="text-violet-700">Order total $</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.orderTotal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, orderTotal: e.target.value }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs">
              <span className="text-violet-700">Insurance expected $</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.insuranceExpected}
                onChange={(e) =>
                  setForm((f) => ({ ...f, insuranceExpected: e.target.value }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="text-violet-700">Patient responsibility $</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.patientResponsibilityTotal}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    patientResponsibilityTotal: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </label>
          </div>

          <p className="text-xs text-violet-700 dark:text-slate-400">
            Insurance collected {money(collectedInsurance)} · Patient collected{" "}
            {money(collectedPatient)}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveOrder()}
              className="rounded bg-brand-600 px-2 py-1 text-xs text-white"
            >
              Save order
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setShowPaymentForm((v) => !v)}
              className="rounded border border-brand-400 px-2 py-1 text-xs text-brand-700"
            >
              + Record payment
            </button>
            {lastPayment && (
              <button
                type="button"
                disabled={saving}
                onClick={prefillFromLastPayment}
                className="rounded border px-2 py-1 text-xs"
              >
                Copy last payment
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={copyOrderTemplate}
              className="rounded border px-2 py-1 text-xs"
            >
              Copy order template
            </button>
            {!isOrderClosed(order) && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setStage("closed")}
                  className="rounded border border-emerald-400 px-2 py-1 text-xs text-emerald-800"
                >
                  Close order
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setStage("lost")}
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                >
                  Mark lost
                </button>
              </>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => void deleteOrder()}
              className="rounded border border-rose-400 px-2 py-1 text-xs text-rose-800"
            >
              Delete order
            </button>
          </div>

          {showPaymentForm && (
            <form
              onSubmit={recordPayment}
              className="rounded border border-violet-200 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="text-xs font-medium">Record payment toward goals</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block text-xs">
                  <span className="text-violet-700">Payment month</span>
                  <input
                    type="month"
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-xs"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-violet-700">Amount $</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    placeholder="50"
                    className="mt-1 w-full rounded border px-2 py-1 text-xs"
                  />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-violet-700">Source</span>
                  <select
                    value={paymentSource}
                    onChange={(e) =>
                      setPaymentSource(e.target.value as "insurance" | "patient")
                    }
                    className="mt-1 w-full rounded border px-2 py-1 text-xs"
                  >
                    <option value="insurance">Insurance</option>
                    <option value="patient">Patient</option>
                  </select>
                </label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-2 rounded bg-brand-600 px-2 py-1 text-xs text-white"
              >
                Save payment
              </button>
            </form>
          )}

          {payments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-violet-800 dark:text-slate-300">
                Payments ({payments.length})
              </p>
              <ul className="mt-1 space-y-1">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between gap-2 rounded border border-violet-100 px-2 py-1 text-xs dark:border-slate-800"
                  >
                    <span>
                      {MONTH_NAMES[p.payment_month - 1]} {p.payment_year} ·{" "}
                      {p.payment_source === "insurance"
                        ? "Insurance"
                        : p.payment_source === "patient"
                          ? "Patient"
                          : "Payment"}
                    </span>
                    <span className="font-medium">{money(paymentAmount(p))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.doctor_id && (
            <Link
              href={`/doctors/${order.doctor_id}`}
              className="inline-block text-xs text-brand-600 hover:underline"
            >
              View prescriber profile & orders
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
