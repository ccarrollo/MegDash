"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DoctorRow, LunchRow, VisitRow } from "@/lib/types";
import { LunchEditor } from "./LunchEditor";
import { LogVisitForm } from "./LogVisitForm";
import { OverrideVisitDateForm } from "./OverrideVisitDateForm";

type TimelineItem = {
  id: string;
  type: "visit" | "lunch";
  at: string;
  text: string;
};

function prettyDate(v: string) {
  return new Date(v).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DoctorProfileEditor({
  doctor,
  visits,
  lunches,
}: {
  doctor: DoctorRow;
  visits: VisitRow[];
  lunches: LunchRow[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(doctor.status);
  const [priority, setPriority] = useState(doctor.priority);
  const [followUpDate, setFollowUpDate] = useState(doctor.follow_up_date ?? "");
  const [lunchDate, setLunchDate] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [lunchNotes, setLunchNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const timeline = useMemo<TimelineItem[]>(() => {
    const visitItems = visits.map((v) => ({
      id: `visit-${v.id}`,
      type: "visit" as const,
      at: v.visited_at,
      text: `${v.outcome}${v.note ? ` — ${v.note}` : ""}`,
    }));
    const lunchItems = lunches.map((l) => ({
      id: `lunch-${l.id}`,
      type: "lunch" as const,
      at: `${l.lunch_date}T12:00:00Z`,
      text: `Lunch ${l.status}${l.restaurant ? ` — ${l.restaurant}` : l.lunch_order ? ` — ${l.lunch_order}` : ""}`,
    }));
    return [...visitItems, ...lunchItems].sort((a, b) =>
      a.at < b.at ? 1 : -1,
    );
  }, [visits, lunches]);

  async function saveDoctorMeta() {
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, priority, followUpDate: followUpDate || null }),
      });
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      alert("Could not save doctor details.");
    } finally {
      setSaving(false);
    }
  }

  async function addLunch() {
    if (!lunchDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lunches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          facilityId: doctor.facility_id,
          lunchDate,
          restaurant: restaurant || null,
          lunchOrder: restaurant || null,
          foodNotes: lunchNotes || null,
          status: "scheduled",
        }),
      });
      if (!res.ok) throw new Error("lunch failed");
      setLunchDate("");
      setRestaurant("");
      setLunchNotes("");
      router.refresh();
    } catch {
      alert("Could not add lunch.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Doctor settings</h2>
        <div className="mt-2 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            >
              <option>1. Active</option>
              <option>2. Introduced</option>
              <option>3. Got Card Only</option>
              <option>4. No Card, FWD info</option>
              <option>8. Target</option>
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saving}
            onClick={saveDoctorMeta}
            className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save settings
          </button>
        </div>
        <OverrideVisitDateForm
          doctorId={doctor.id}
          doctorName={doctor.name}
          currentDate={doctor.manual_last_visit_date ?? doctor.last_visit_at}
          isOverridden={doctor.is_last_visit_overridden}
        />
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Log activity</h2>
        <div className="mt-2">
          <LogVisitForm doctorId={doctor.id} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Lunches</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
          Change date, cancel, or fill in restaurant, headcount, and cost after ordering.
        </p>

        {lunches.length > 0 && (
          <div className="mt-4 space-y-3">
            {lunches.map((l) => (
              <LunchEditor key={l.id} lunch={l} />
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Schedule new lunch</p>
          <div className="mt-2 grid gap-2">
            <input
              type="date"
              value={lunchDate}
              onChange={(e) => setLunchDate(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Lunches are planned at 12:00 PM.</p>
            <input
              value={restaurant}
              onChange={(e) => setRestaurant(e.target.value)}
              placeholder="Restaurant / place"
              className="rounded border px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              value={lunchNotes}
              onChange={(e) => setLunchNotes(e.target.value)}
              placeholder="Dietary / logistics notes"
              className="rounded border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={saving || !lunchDate}
              onClick={addLunch}
              className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add lunch
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">No history yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {timeline.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-400">
                  {item.type} · {prettyDate(item.at)}
                </p>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{item.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
