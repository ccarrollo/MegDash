"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PRODUCTS = ["AccelStim", "PhysioStim"] as const;

export function AddPaidSaleForm({
  year,
  month,
  doctors,
}: {
  year: number;
  month: number;
  doctors: { id: string; name: string; facility_name?: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [mySalesAmount, setMySalesAmount] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [product, setProduct] = useState("AccelStim");
  const [paymentYear, setPaymentYear] = useState(String(year));
  const [paymentMonth, setPaymentMonth] = useState(String(month));
  const [notes, setNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(mySalesAmount);
    if (!Number.isFinite(amt)) {
      alert("Enter My Sales $ (0 for comp/giveaway).");
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
      const res = await fetch("/api/sales/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctorId || null,
          patientLabel: patientLabel || null,
          paymentYear: py,
          paymentMonth: pm,
          mySalesAmount: amt,
          actualCost:
            actualCost.trim() === ""
              ? null
              : parseFloat(actualCost),
          product,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "failed");
      }
      setOpen(false);
      setPatientLabel("");
      setMySalesAmount("");
      setActualCost("");
      setNotes("");
      router.refresh();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Could not save sale.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-brand-400 dark:border-brand-600 bg-fuchsia-50 dark:bg-slate-900 py-2 text-sm font-medium text-brand-700"
      >
        + Add paid sale
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-brand-200 dark:border-brand-800 bg-fuchsia-50 dark:bg-slate-900 p-3 space-y-3"
    >
      <p className="text-sm font-medium">Add paid sale (3PP)</p>
      <p className="text-xs text-violet-700 dark:text-slate-400">
        My Sales $ is per order — use 0 for comp or giveaway. Device cost is
        optional (what the device cost the practice).
      </p>

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Doctor</span>
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
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
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">My Sales $ *</span>
          <input
            type="number"
            min={0}
            step={0.01}
            required
            value={mySalesAmount}
            onChange={(e) => setMySalesAmount(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded border px-2 py-1 text-sm font-semibold"
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
            placeholder="Optional"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </label>
      </div>

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Product</span>
        <select
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
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
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
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
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </label>
      </div>

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Notes</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white"
        >
          {saving ? "Saving…" : "Save sale"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setOpen(false)}
          className="rounded border px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
