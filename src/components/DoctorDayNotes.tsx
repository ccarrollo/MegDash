"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  buildDoctorDayNoteBuckets,
  buildLegacyDoctorNotes,
  formatNoteDateHeader,
  type DoctorDayNoteBucket,
} from "@/lib/doctorDayNotes";
import {
  isDetailOutcome,
  isVisitTypeOutcome,
  outcomeLabel,
} from "@/lib/visitDetailOptions";
import type {
  DoctorDayNoteRow,
  DoctorRow,
  LunchRow,
  NoteRow,
  VisitRow,
} from "@/lib/types";

const EXPANDED_KEY = "meg-field:doctor-note-days";

function readExpanded(doctorId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${EXPANDED_KEY}:${doctorId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistExpanded(doctorId: string, dates: Set<string>) {
  localStorage.setItem(
    `${EXPANDED_KEY}:${doctorId}`,
    JSON.stringify([...dates]),
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function summarizeBucket(bucket: DoctorDayNoteBucket): string {
  const parts: string[] = [];
  const visitTypes = [
    ...new Set(
      bucket.visits
        .map((v) => v.outcome)
        .filter(
          (o) =>
            o === "in_person_visit" ||
            o === "remote_contact" ||
            isVisitTypeOutcome(o),
        ),
    ),
  ];
  const details = [
    ...new Set(bucket.visits.map((v) => v.outcome).filter(isDetailOutcome)),
  ];

  if (visitTypes.length > 0) {
    parts.push(visitTypes.map(outcomeLabel).join(", "));
  }
  if (details.length > 0) {
    parts.push(`${details.length} detail${details.length === 1 ? "" : "s"}`);
  }
  if (bucket.lunches.length > 0) {
    parts.push(`Lunch (${bucket.lunches.length})`);
  }
  if (bucket.body.trim()) {
    parts.push("Has notes");
  }
  return parts.length > 0 ? parts.join(" · ") : "No activity yet";
}

function DayNoteBucket({
  doctorId,
  bucket,
  expanded,
  onToggle,
}: {
  doctorId: string;
  bucket: DoctorDayNoteBucket;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState(bucket.body);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBody(bucket.body);
  }, [bucket.body]);

  const visitTypes = useMemo(
    () =>
      [
        ...new Set(
          bucket.visits
            .map((v) => v.outcome)
            .filter(
              (o) =>
                o === "in_person_visit" ||
                o === "remote_contact" ||
                isVisitTypeOutcome(o),
            ),
        ),
      ].map(outcomeLabel),
    [bucket.visits],
  );

  const details = useMemo(
    () =>
      [
        ...new Set(
          bucket.visits.map((v) => v.outcome).filter(isDetailOutcome),
        ),
      ].map(outcomeLabel),
    [bucket.visits],
  );

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/day-notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteDate: bucket.noteDate, body }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save notes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li
      id={`doctor-note-${bucket.noteDate}`}
      className="scroll-mt-24 rounded-lg border border-violet-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/40"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="min-w-0">
          <p className="font-medium text-violet-950 dark:text-slate-100">
            Notes {formatNoteDateHeader(bucket.noteDate)}
          </p>
          {!expanded && (
            <p className="mt-0.5 truncate text-xs text-violet-700 dark:text-slate-400">
              {summarizeBucket(bucket)}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs text-brand-600">
          {expanded ? "Hide" : "Open"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-violet-100 px-3 pb-3 pt-2 dark:border-slate-800">
          {(visitTypes.length > 0 ||
            details.length > 0 ||
            bucket.lunches.length > 0) && (
            <div className="space-y-2 text-xs">
              {visitTypes.length > 0 && (
                <div>
                  <p className="font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
                    Visit
                  </p>
                  <ul className="mt-1 list-inside list-disc text-violet-900 dark:text-slate-300">
                    {visitTypes.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
              )}
              {details.length > 0 && (
                <div>
                  <p className="font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
                    Details
                  </p>
                  <ul className="mt-1 list-inside list-disc text-violet-900 dark:text-slate-300">
                    {details.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
              )}
              {bucket.lunches.map((lunch) => (
                <div key={lunch.id}>
                  <p className="font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
                    Lunch
                  </p>
                  <p className="mt-1 text-violet-900 dark:text-slate-300">
                    {lunch.status}
                    {lunch.restaurant ? ` · ${lunch.restaurant}` : ""}
                    {lunch.interaction_notes
                      ? ` — ${lunch.interaction_notes}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
              Notes for this day
            </span>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What happened, follow-ups, context…"
              className="mt-1 w-full rounded-lg border border-violet-300 px-3 py-2 text-sm dark:border-slate-600"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
        </div>
      )}
    </li>
  );
}

export function DoctorDayNotes({
  doctor,
  visits,
  lunches,
  dayNotes,
  legacyNotes,
}: {
  doctor: DoctorRow;
  visits: VisitRow[];
  lunches: LunchRow[];
  dayNotes: DoctorDayNoteRow[];
  legacyNotes: NoteRow[];
}) {
  const buckets = useMemo(
    () =>
      buildDoctorDayNoteBuckets({
        visits,
        lunches,
        dayNotes,
        legacyNotes,
      }),
    [visits, lunches, dayNotes, legacyNotes],
  );

  const legacy = useMemo(() => buildLegacyDoctorNotes(doctor), [doctor]);

  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());
  const [manualDate, setManualDate] = useState(todayIso());
  const [pendingOpenDate, setPendingOpenDate] = useState<string | null>(null);

  useEffect(() => {
    setExpandedDates(readExpanded(doctor.id));
  }, [doctor.id]);

  useEffect(() => {
    if (!pendingOpenDate) return;
    setExpandedDates((current) => {
      const next = new Set(current);
      next.add(pendingOpenDate);
      persistExpanded(doctor.id, next);
      return next;
    });
    setPendingOpenDate(null);
    window.setTimeout(() => {
      document
        .getElementById(`doctor-note-${pendingOpenDate}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, [pendingOpenDate, doctor.id, buckets.length]);

  function toggleDate(noteDate: string) {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(noteDate)) next.delete(noteDate);
      else next.add(noteDate);
      persistExpanded(doctor.id, next);
      return next;
    });
  }

  function openManualDate() {
    setPendingOpenDate(manualDate);
  }

  const displayBuckets = useMemo(() => {
    if (!pendingOpenDate) return buckets;
    if (buckets.some((b) => b.noteDate === pendingOpenDate)) return buckets;
    return [
      {
        noteDate: pendingOpenDate,
        body: "",
        visits: [],
        lunches: [],
      },
      ...buckets,
    ];
  }, [buckets, pendingOpenDate]);

  return (
    <section className="rounded-xl border border-violet-200 bg-fuchsia-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="font-semibold">Notes</h2>
      <p className="mt-1 text-xs text-violet-700 dark:text-slate-400">
        One journal per day — visits and details create a date automatically, or
        pick a day to add notes manually.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block text-xs">
          <span className="text-violet-700 dark:text-slate-400">Note date</span>
          <input
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            className="mt-1 block rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={openManualDate}
          className="rounded border border-brand-400 px-3 py-1.5 text-xs font-medium text-brand-700"
        >
          + Add note for this date
        </button>
      </div>

      {displayBuckets.length === 0 && !legacy ? (
        <p className="mt-3 text-sm text-violet-700 dark:text-slate-400">
          No notes yet. Log a visit or add a note for today.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {displayBuckets.map((bucket) => (
            <DayNoteBucket
              key={bucket.noteDate}
              doctorId={doctor.id}
              bucket={bucket}
              expanded={expandedDates.has(bucket.noteDate)}
              onToggle={() => toggleDate(bucket.noteDate)}
            />
          ))}
        </ul>
      )}

      {legacy && (
        <details className="mt-4 rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
          <summary className="cursor-pointer text-sm font-medium text-violet-900 dark:text-slate-200">
            Imported sheet notes
          </summary>
          <div className="mt-2 space-y-2 text-sm text-violet-900 dark:text-slate-300">
            {legacy.sections.map((section) => (
              <div key={section.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-slate-400">
                  {section.label}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{section.body}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
