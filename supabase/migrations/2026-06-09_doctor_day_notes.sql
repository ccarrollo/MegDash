-- One editable note body per doctor per calendar day

create table if not exists doctor_day_notes (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  note_date date not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doctor_id, note_date)
);

create index if not exists doctor_day_notes_doctor_date_idx
  on doctor_day_notes(doctor_id, note_date desc);
