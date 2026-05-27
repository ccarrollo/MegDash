"use client";

import { ANCHOR_TYPES } from "@/lib/constants";
import type { DayAnchorRow, DoctorRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

function formatTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m?.slice(0, 2) ?? "00"} ${ampm}`;
}

export function DayAnchorsPanel({
  anchors,
  doctors,
  planDate,
}: {
  anchors: DayAnchorRow[];
  doctors: DoctorRow[];
  planDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [anchorTime, setAnchorTime] = useState("08:00");
  const [anchorType, setAnchorType] = useState("coffee");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const manualAnchors = anchors.filter((a) => !a.is_auto);
  const autoAnchors = anchors.filter((a) => a.is_auto);

  async function addAnchor() {
    if (!doctorId) {
      alert("Pick a doctor for this anchor.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/day-anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          doctorId,
          anchorTime: anchorTime || null,
          anchorType,
          label: label.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setDoctorId("");
      setLabel("");
      setOpen(false);
      router.refresh();
    } catch {
      alert("Could not add anchor.");
    } finally {
      setLoading(false);
    }
  }

  async function removeAnchor(id: string) {
    if (!window.confirm("Remove this anchor?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/day-anchors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      alert("Could not remove anchor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Day anchors</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
            Lunches on this date appear here automatically. Add coffee or extra
            office stops manually.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300"
        >
          {open ? "Cancel" : "+ Anchor"}
        </button>
      </div>

      {autoAnchors.length > 0 && (
        <ul className="mt-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            From lunch schedule
          </p>
          {autoAnchors.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm"
            >
              <span className="font-medium capitalize">{a.anchor_type}</span>
              {a.anchor_time && (
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400"> · {formatTime(a.anchor_time)}</span>
              )}
              <p className="text-slate-700 dark:text-slate-300">{a.doctor_name ?? "Doctor"}</p>
            </li>
          ))}
        </ul>
      )}

      {manualAnchors.length > 0 && (
        <ul className="mt-3 space-y-2">
          {manualAnchors.length > 0 && autoAnchors.length > 0 && (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-400">
              Manual
            </p>
          )}
          {manualAnchors.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium capitalize">{a.anchor_type}</span>
                {a.anchor_time && (
                  <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400"> · {formatTime(a.anchor_time)}</span>
                )}
                <p className="text-slate-700 dark:text-slate-300">{a.doctor_name ?? "Doctor"}</p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => removeAnchor(a.id)}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {anchors.length === 0 && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
          No anchors — schedule a lunch on a doctor profile for this date.
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Select doctor…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.facility_name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={anchorType}
              onChange={(e) => setAnchorType(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            >
              {ANCHOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={anchorTime}
              onChange={(e) => setAnchorTime(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional label"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={loading}
            onClick={addAnchor}
            className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add anchor
          </button>
        </div>
      )}
    </section>
  );
}
