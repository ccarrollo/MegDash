"use client";

import { buildEditableNoteFields } from "@/lib/mergeNotes";
import type { DoctorRow, NoteRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FieldKey =
  | "interaction_notes"
  | "follow_up_lunch"
  | "front_desk_notes"
  | "competitor_notes"
  | "order_history"
  | "facility_office_vibe";

const FIELDS: { key: FieldKey; label: string; facility?: boolean }[] = [
  { key: "interaction_notes", label: "Interaction notes" },
  { key: "follow_up_lunch", label: "Lunch / follow-up" },
  { key: "front_desk_notes", label: "Front desk" },
  { key: "competitor_notes", label: "Competitor" },
  { key: "order_history", label: "Order history" },
  { key: "facility_office_vibe", label: "Office vibe (facility)", facility: true },
];

export function EditableDoctorNotes({
  doctor,
  notes,
}: {
  doctor: DoctorRow;
  notes: NoteRow[];
}) {
  const router = useRouter();
  const initial = useMemo(
    () => buildEditableNoteFields(doctor, notes),
    [doctor, notes],
  );
  const [values, setValues] = useState<Record<FieldKey, string>>(initial);
  const [saving, setSaving] = useState<string | null>(null);

  async function saveField(key: FieldKey, facility: boolean) {
    setSaving(key);
    try {
      const url = facility
        ? `/api/facilities/${doctor.facility_id}`
        : `/api/doctors/${doctor.id}`;
      const body = facility
        ? { officeVibe: values[key].trim() || null }
        : { [key]: values[key].trim() || null };
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      alert("Could not save note.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <h2 className="font-semibold">Notes</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
        Imported sheet text and timeline entries are merged here. Edit and save
        each section.
      </p>
      <div className="mt-3 space-y-4">
        {FIELDS.map(({ key, label, facility }) => (
          <label key={key} className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-400">
              {label}
            </span>
            <textarea
              rows={key === "interaction_notes" ? 6 : 3}
              value={values[key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [key]: e.target.value }))
              }
              placeholder={`${label}…`}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={saving === key}
              onClick={() => saveField(key, Boolean(facility))}
              className="mt-1 rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving === key ? "Saving…" : "Save"}
            </button>
          </label>
        ))}
      </div>
    </section>
  );
}
