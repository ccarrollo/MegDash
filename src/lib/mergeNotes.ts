import type { DoctorRow, NoteRow } from "./types";

export type EditableNoteFields = {
  interaction_notes: string;
  front_desk_notes: string;
  competitor_notes: string;
  follow_up_lunch: string;
  order_history: string;
  facility_office_vibe: string;
};

/** Import order: Interaction, Other, Front desk, Competitor */
export function buildEditableNoteFields(
  doctor: DoctorRow,
  notes: NoteRow[],
): EditableNoteFields {
  const sorted = [...notes].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const byCategory = (cat: string) =>
    sorted.find((n) => n.category === cat)?.body?.trim() ?? "";

  const pick = (doctorVal: string | null | undefined, ...fromNotes: (string | undefined)[]) => {
    const d = doctorVal?.trim() ?? "";
    if (d) return d;
    return fromNotes.map((n) => n?.trim()).filter(Boolean).join("\n\n---\n\n");
  };

  return {
    interaction_notes: pick(
      doctor.interaction_notes,
      byCategory("interaction"),
      byCategory("other"),
      sorted[0]?.body,
      sorted[1]?.body,
    ),
    front_desk_notes: pick(
      doctor.front_desk_notes,
      byCategory("front_desk"),
      sorted[2]?.body,
    ),
    competitor_notes: pick(
      doctor.competitor_notes,
      byCategory("competitor"),
      sorted[3]?.body,
    ),
    follow_up_lunch: pick(doctor.follow_up_lunch),
    order_history: pick(doctor.order_history),
    facility_office_vibe: doctor.facility_office_vibe?.trim() ?? "",
  };
}

/** Note bodies already represented in a saved field (hide from duplicate pool). */
export function noteBodiesAlreadyInFields(
  fields: EditableNoteFields,
  notes: NoteRow[],
): boolean {
  const blob = Object.values(fields).join("\n");
  return notes.every((n) => {
    const b = n.body.trim();
    if (!b) return true;
    return blob.includes(b);
  });
}
