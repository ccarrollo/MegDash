"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  combineFittingDateTime,
  defaultOrderEnteredDate,
  orderEnteredDate,
  splitFittingDateTime,
} from "@/lib/orderFormDates";
import type { OrderRow } from "@/lib/types";
import { OrderDateFields } from "./OrderDateFields";

function orderToFormDefaults(template: OrderRow | null | undefined) {
  if (!template) {
    return {
      patientLabel: "",
      insurance: "",
      doctorId: "",
      orderedAt: defaultOrderEnteredDate(),
      fittedDate: "",
      fittedTime: "",
      channel: "3pp" as "3pp" | "wholesale",
      product: "PhysioStim" as "AccelStim" | "PhysioStim",
      orderTotal: "",
      insuranceExpected: "",
      patientResponsibilityTotal: "",
    };
  }
  return {
    patientLabel: template.patient_label ?? "",
    insurance: template.insurance ?? "",
    doctorId: template.doctor_id ?? "",
    orderedAt:
      orderEnteredDate(template.ordered_at) || defaultOrderEnteredDate(),
    fittedDate: splitFittingDateTime(template.fitted_at).date,
    fittedTime: splitFittingDateTime(template.fitted_at).time,
    channel: (template.channel === "wholesale" ? "wholesale" : "3pp") as
      | "3pp"
      | "wholesale",
    product:
      template.product === "AccelStim"
        ? ("AccelStim" as const)
        : ("PhysioStim" as const),
    orderTotal:
      template.order_total != null ? String(template.order_total) : "",
    insuranceExpected:
      template.insurance_expected != null
        ? String(template.insurance_expected)
        : "",
    patientResponsibilityTotal:
      template.patient_responsibility_total != null
        ? String(template.patient_responsibility_total)
        : "",
  };
}

export function AddNewOrderForm({
  doctors,
  templateFrom,
  onClearTemplate,
}: {
  doctors: { id: string; name: string; facility_name?: string | null }[];
  templateFrom?: OrderRow | null;
  onClearTemplate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(templateFrom));
  const [saving, setSaving] = useState(false);
  const [doctorQuery, setDoctorQuery] = useState("");
  const [dateFieldKey, setDateFieldKey] = useState(0);
  const [form, setForm] = useState(() => orderToFormDefaults(templateFrom));

  useEffect(() => {
    if (templateFrom) {
      setForm(orderToFormDefaults(templateFrom));
      setOpen(true);
    }
  }, [templateFrom]);

  const activeDoctors = useMemo(
    () => doctors.filter((d) => !("status" in d) || (d as { status?: string }).status !== "9. Archived"),
    [doctors],
  );

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return activeDoctors;
    return activeDoctors.filter((d) =>
      `${d.name} ${d.facility_name ?? ""}`.toLowerCase().includes(q),
    );
  }, [activeDoctors, doctorQuery]);

  function parseMoney(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.doctorId) {
      alert("Pick a prescriber.");
      return;
    }
    if (!form.patientLabel.trim()) {
      alert("Enter patient name.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: form.doctorId,
          patientLabel: form.patientLabel.trim(),
          insurance: form.insurance.trim() || null,
          orderedAt: form.orderedAt || null,
          fittedAt: combineFittingDateTime(form.fittedDate, form.fittedTime),
          channel: form.channel,
          product: form.product,
          orderTotal: parseMoney(form.orderTotal),
          insuranceExpected: parseMoney(form.insuranceExpected),
          patientResponsibilityTotal: parseMoney(form.patientResponsibilityTotal),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save order");
      setOpen(false);
      setForm(orderToFormDefaults(null));
      setDateFieldKey((k) => k + 1);
      setDoctorQuery("");
      onClearTemplate?.();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save order.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setDateFieldKey((k) => k + 1);
          setOpen(true);
        }}
        className="w-full rounded-lg border border-dashed border-brand-400 bg-fuchsia-50 py-2.5 text-sm font-medium text-brand-700 dark:border-brand-600 dark:bg-slate-900"
      >
        + Add New Order
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-brand-200 bg-brand-50/30 p-3 space-y-3 dark:border-brand-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Add New Order</p>
          {templateFrom && (
            <p className="text-xs text-violet-700 dark:text-slate-400">
              Pre-filled from copied order — edit before saving.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-violet-700 hover:underline"
        >
          Cancel
        </button>
      </div>

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Patient name *</span>
        <input
          required
          value={form.patientLabel}
          onChange={(e) => setForm((f) => ({ ...f, patientLabel: e.target.value }))}
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>

      <label className="block text-xs">
        <span className="text-violet-700 dark:text-slate-400">Payer</span>
        <input
          value={form.insurance}
          onChange={(e) => setForm((f) => ({ ...f, insurance: e.target.value }))}
          placeholder="Insurance / payer name"
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
        />
      </label>

      <div className="space-y-1">
        <span className="text-xs text-violet-700 dark:text-slate-400">Prescriber *</span>
        <input
          value={doctorQuery}
          onChange={(e) => setDoctorQuery(e.target.value)}
          placeholder="Search doctors…"
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
        <select
          required
          value={form.doctorId}
          onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
          className="w-full rounded border px-2 py-1.5 text-sm"
        >
          <option value="">Select prescriber…</option>
          {filteredDoctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.facility_name ? ` · ${d.facility_name}` : ""}
            </option>
          ))}
        </select>
      </div>

      <OrderDateFields
        key={dateFieldKey}
        idPrefix="new-order"
        orderedAt={form.orderedAt}
        fittedDate={form.fittedDate}
        fittedTime={form.fittedTime}
        onOrderedAtChange={(orderedAt) =>
          setForm((f) => ({ ...f, orderedAt }))
        }
        onFittedDateChange={(fittedDate) =>
          setForm((f) => ({
            ...f,
            fittedDate,
            fittedTime: fittedDate ? f.fittedTime || "12:00" : "",
          }))
        }
        onFittedTimeChange={(fittedTime) =>
          setForm((f) => ({ ...f, fittedTime }))
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Channel</span>
          <select
            value={form.channel}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                channel: e.target.value as "3pp" | "wholesale",
              }))
            }
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          >
            <option value="3pp">3PP</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </label>
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Product</span>
          <select
            value={form.product}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                product: e.target.value as "AccelStim" | "PhysioStim",
              }))
            }
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          >
            <option value="AccelStim">AccelStim</option>
            <option value="PhysioStim">PhysioStim</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Order total $</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.orderTotal}
            onChange={(e) => setForm((f) => ({ ...f, orderTotal: e.target.value }))}
            placeholder="4000"
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Insurance $</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.insuranceExpected}
            onChange={(e) =>
              setForm((f) => ({ ...f, insuranceExpected: e.target.value }))
            }
            placeholder="3200"
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Patient resp. $</span>
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
            placeholder="800"
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <p className="text-xs text-violet-700 dark:text-slate-400">
        Record insurance and patient payments on the order after saving — including
        $50/month plan payments when they arrive.
      </p>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save order"}
      </button>
    </form>
  );
}
