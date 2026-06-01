import type { DoctorDayNoteRow, DoctorRow, LunchRow, NoteRow, VisitRow } from "./types";

export type { DoctorDayNoteRow };

export type DoctorDayNoteBucket = {
  noteDate: string;
  body: string;
  visits: VisitRow[];
  lunches: LunchRow[];
};

function visitDateKey(visitedAt: string): string {
  return visitedAt.slice(0, 10);
}

function noteCreatedDateKey(createdAt: string): string {
  return createdAt.slice(0, 10);
}

export function buildDoctorDayNoteBuckets({
  visits,
  lunches,
  dayNotes,
  legacyNotes,
}: {
  visits: VisitRow[];
  lunches: LunchRow[];
  dayNotes: DoctorDayNoteRow[];
  legacyNotes: NoteRow[];
}): DoctorDayNoteBucket[] {
  const map = new Map<string, DoctorDayNoteBucket>();

  const ensure = (noteDate: string): DoctorDayNoteBucket => {
    const existing = map.get(noteDate);
    if (existing) return existing;
    const bucket: DoctorDayNoteBucket = {
      noteDate,
      body: "",
      visits: [],
      lunches: [],
    };
    map.set(noteDate, bucket);
    return bucket;
  };

  for (const visit of visits) {
    const bucket = ensure(visitDateKey(visit.visited_at));
    bucket.visits.push(visit);
  }

  for (const lunch of lunches) {
    const bucket = ensure(lunch.lunch_date.slice(0, 10));
    bucket.lunches.push(lunch);
  }

  for (const row of dayNotes) {
    const bucket = ensure(row.note_date.slice(0, 10));
    bucket.body = row.body ?? "";
  }

  for (const note of legacyNotes) {
    const bucket = ensure(noteCreatedDateKey(note.created_at));
    const text = note.body.trim();
    if (!text) continue;
    bucket.body = bucket.body.trim()
      ? `${bucket.body.trim()}\n\n${text}`
      : text;
  }

  return [...map.values()].sort((a, b) =>
    a.noteDate < b.noteDate ? 1 : a.noteDate > b.noteDate ? -1 : 0,
  );
}

export type LegacyDoctorNotes = {
  body: string;
  sections: { label: string; body: string }[];
};

export function buildLegacyDoctorNotes(doctor: DoctorRow): LegacyDoctorNotes | null {
  const sections = [
    { label: "Interaction notes", body: doctor.interaction_notes?.trim() ?? "" },
    { label: "Lunch / follow-up", body: doctor.follow_up_lunch?.trim() ?? "" },
    { label: "Front desk", body: doctor.front_desk_notes?.trim() ?? "" },
    { label: "Competitor", body: doctor.competitor_notes?.trim() ?? "" },
    { label: "Order history", body: doctor.order_history?.trim() ?? "" },
    {
      label: "Office vibe",
      body: doctor.facility_office_vibe?.trim() ?? "",
    },
  ].filter((s) => s.body);

  if (sections.length === 0) return null;

  return {
    sections,
    body: sections.map((s) => `${s.label}\n${s.body}`).join("\n\n"),
  };
}

export function formatNoteDateHeader(noteDate: string): string {
  const d = new Date(`${noteDate}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}
