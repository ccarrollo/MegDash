import type { DoctorRow, LunchRow, NoteRow } from "@/lib/types";

function NoteBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{body}</p>
    </div>
  );
}

export function DoctorContextNotes({
  doctor,
  notes,
  lunches,
}: {
  doctor: DoctorRow;
  notes: NoteRow[];
  lunches: LunchRow[];
}) {
  const lunchNotes = lunches
    .flatMap((l) => {
      const parts: string[] = [];
      if (l.food_notes) parts.push(`Food: ${l.food_notes}`);
      if (l.interaction_notes) parts.push(`Interaction: ${l.interaction_notes}`);
      if (l.lunch_order && !l.restaurant) parts.push(`Order: ${l.lunch_order}`);
      if (parts.length === 0) return [];
      return [`${l.lunch_date} — ${parts.join(" · ")}`];
    })
    .join("\n");

  const blocks: { label: string; body: string }[] = [];
  if (doctor.follow_up_lunch?.trim()) {
    blocks.push({ label: "Lunch / follow-up (sheet)", body: doctor.follow_up_lunch });
  }
  if (doctor.front_desk_notes?.trim()) {
    blocks.push({ label: "Front desk", body: doctor.front_desk_notes });
  }
  if (doctor.competitor_notes?.trim()) {
    blocks.push({ label: "Competitor", body: doctor.competitor_notes });
  }
  if (doctor.order_history?.trim()) {
    blocks.push({ label: "Order history", body: doctor.order_history });
  }
  if (doctor.facility_office_vibe?.trim()) {
    blocks.push({ label: "Office vibe (facility)", body: doctor.facility_office_vibe });
  }
  if (lunchNotes) {
    blocks.push({ label: "Lunch notes", body: lunchNotes });
  }

  const hasSavedNotes = notes.length > 0;
  if (blocks.length === 0 && !hasSavedNotes) {
    return (
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold">Notes</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">No imported or saved notes yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <h2 className="font-semibold">Notes</h2>
      <div className="mt-3 space-y-2">
        {blocks.map((b) => (
          <NoteBlock key={b.label} label={b.label} body={b.body} />
        ))}
        {hasSavedNotes && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-400">
              Saved notes
            </p>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-300"
                >
                  {n.body}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
