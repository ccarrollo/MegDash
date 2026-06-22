"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPaymentMoney, paymentAmount } from "@/lib/orders";
import type { SaleRecordRow } from "@/lib/types";

const PRODUCTS = ["AccelStim", "PhysioStim"] as const;

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

function productSelectValue(product: string | null) {
  if (product === "AccelStim" || product === "PhysioStim") return product;
  if ((product ?? "").toLowerCase().includes("accel")) return "AccelStim";
  return "PhysioStim";
}

export function PaidSaleRow({
  sale,
  doctors,
}: {
  sale: SaleRecordRow;
  doctors: { id: string; name: string; facility_name?: string | null }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState(sale.doctor_id ?? "");
  const [patientLabel, setPatientLabel] = useState(sale.patient_label ?? "");
  const [mySalesAmount, setMySalesAmount] = useState(
    String(paymentAmount(sale)),
  );
  const [actualCost, setActualCost] = useState(
    sale.actual_cost != null ? String(sale.actual_cost) : "",
  );
  const [product, setProduct] = useState(productSelectValue(sale.product));
  const [paymentYear, setPaymentYear] = useState(String(sale.payment_year));
  const [paymentMonth, setPaymentMonth] = useState(String(sale.payment_month));
  const [notes, setNotes] = useState(sale.notes ?? "");

  function resetForm() {
    setDoctorId(sale.doctor_id ?? "");
    setPatientLabel(sale.patient_label ?? "");
    setMySalesAmount(String(paymentAmount(sale)));
    setActualCost(sale.actual_cost != null ? String(sale.actual_cost) : "");
    setProduct(productSelectValue(sale.product));
    setPaymentYear(String(sale.payment_year));
    setPaymentMonth(String(sale.payment_month));
    setNotes(sale.notes ?? "");
  }

  function startEdit() {
    resetForm();
    setEditing(true);
  }

  function cancelEdit() {
    resetForm();
    setEditing(false);
  }

  async function save() {
    const amt = parseFloat(mySalesAmount);
    if (!Number.isFinite(amt)) {
      alert("Enter My Sales $ (negative for refunds, 0 for comp).");
      return;
    }
    const py = parseInt(paymentYear, 10);
    const pm = parseInt(paymentMonth, 10);
    if (!py || !pm || pm < 1 || pm > 12) {
      alert("Invalid payment month.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sales/records/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctorId || null,
          patientLabel: patientLabel || null,
          paymentYear: py,
          paymentMonth: pm,
          mySalesAmount: amt,
          actualCost:
            actualCost.trim() === "" ? null : parseFloat(actualCost),
          product,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "failed");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save sale.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        "Remove this paid sale? Commission will recalculate without it.",
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/sales/records/${sale.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "failed");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not remove sale.");
    } finally {
      setSaving(false);
    }
  }

  const amt = paymentAmount(sale);

  if (!editing) {
    return (
      <li className="rounded-lg border border-violet-100 dark:border-slate-800 p-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">
              {sale.patient_label ?? "Patient"}
              {sale.doctor_name ? ` — ${sale.doctor_name}` : ""}
            </p>
            <p className="text-xs text-violet-700 dark:text-slate-400">
              Payment: {MONTH_NAMES[sale.payment_month - 1]} {sale.payment_year}
              {sale.product && ` · ${sale.product}`}
              {` · My Sales ${formatPaymentMoney(amt)}`}
              {sale.actual_cost != null &&
                ` · Device ${money(Number(sale.actual_cost))}`}
            </p>
            {sale.order_id && (
              <p className="mt-0.5 text-xs text-violet-600 dark:text-slate-400">
                Linked to pipeline order
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 text-xs text-brand-600 hover:underline"
          >
            Edit
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/30 p-3 text-sm space-y-3">
      <p className="font-medium">Edit paid sale</p>
      {sale.order_id && (
        <p className="text-xs text-violet-700 dark:text-slate-400">
          Linked to a pipeline order — saves update both records.
        </p>
      )}

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Doctor</span>
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          disabled={saving}
          className="mt-1 w-full rounded border px-2 py-1 text-sm bg-fuchsia-50 dark:bg-slate-900"
        >
          <option value="">— optional —</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.facility_name ? ` · ${d.facility_name}` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Patient name</span>
        <input
          value={patientLabel}
          onChange={(e) => setPatientLabel(e.target.value)}
          disabled={saving}
          className="mt-1 w-full rounded border px-2 py-1 text-sm bg-fuchsia-50 dark:bg-slate-900"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">My Sales $ *</span>
          <input
            type="number"
            step={0.01}
            value={mySalesAmount}
            onChange={(e) => setMySalesAmount(e.target.value)}
            disabled={saving}
            placeholder="0 or -25 refund"
            className="mt-1 w-full rounded border px-2 py-1 text-sm font-semibold bg-fuchsia-50 dark:bg-slate-900"
          />
        </label>
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Device cost $</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            disabled={saving}
            placeholder="Optional"
            className="mt-1 w-full rounded border px-2 py-1 text-sm bg-fuchsia-50 dark:bg-slate-900"
          />
        </label>
      </div>

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Product</span>
        <select
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          disabled={saving}
          className="mt-1 w-full rounded border px-2 py-1 text-sm bg-fuchsia-50 dark:bg-slate-900"
        >
          {PRODUCTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Payment year</span>
          <input
            type="number"
            value={paymentYear}
            onChange={(e) => setPaymentYear(e.target.value)}
            disabled={saving}
            className="mt-1 w-full rounded border px-2 py-1 text-sm bg-fuchsia-50 dark:bg-slate-900"
          />
        </label>
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Payment month (1–12)</span>
          <input
            type="number"
            min={1}
            max={12}
            value={paymentMonth}
            onChange={(e) => setPaymentMonth(e.target.value)}
            disabled={saving}
            className="mt-1 w-full rounded border px-2 py-1 text-sm bg-fuchsia-50 dark:bg-slate-900"
          />
        </label>
      </div>

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Notes</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={saving}
          className="mt-1 w-full rounded border px-2 py-1 text-sm bg-fuchsia-50 dark:bg-slate-900"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded bg-brand-600 px-3 py-1.5 text-xs text-white"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={cancelEdit}
          className="rounded border bg-fuchsia-50 dark:bg-slate-900 px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void remove()}
          className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
