"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DoctorRow } from "@/lib/types";
import { LogVisitForm } from "./LogVisitForm";
import { OverrideVisitDateForm } from "./OverrideVisitDateForm";

export function DoctorProfileEditor({
  doctor,
}: {
  doctor: DoctorRow;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(doctor.status);
  const [dailyQueueHidden, setDailyQueueHidden] = useState(
    doctor.daily_queue_hidden ?? false,
  );
  const [saving, setSaving] = useState(false);

  async function saveDoctorMeta() {
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          dailyQueueHidden,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      alert("Could not save doctor details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Doctor settings</h2>
        <div className="mt-2 grid gap-2">
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
            <option>9. Archived</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-violet-900 dark:text-slate-300">
            <input
              type="checkbox"
              checked={dailyQueueHidden}
              onChange={(e) => setDailyQueueHidden(e.target.checked)}
            />
            Don't show in daily queue
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={saveDoctorMeta}
            className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save settings
          </button>
          <p className="text-xs text-violet-700 dark:text-slate-400">
            Set status to <strong>9. Archived</strong> to hide this doctor from default lists.
          </p>
        </div>
        <OverrideVisitDateForm
          doctorId={doctor.id}
          doctorName={doctor.name}
          currentDate={doctor.manual_last_visit_date ?? doctor.last_visit_at}
          isOverridden={doctor.is_last_visit_overridden}
        />
      </section>

      <section className="rounded-xl border border-violet-200 dark:border-slate-700 bg-fuchsia-50 dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Log activity</h2>
        <div className="mt-2">
          <LogVisitForm doctorId={doctor.id} />
        </div>
      </section>

    </div>
  );
}
