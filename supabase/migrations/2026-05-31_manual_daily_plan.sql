alter table daily_plan_settings
  add column if not exists auto_suggestions boolean not null default true;

create table if not exists daily_plan_manual_stops (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  doctor_id uuid not null references doctors(id) on delete cascade,
  kind text not null default 'visit',
  sort_order int not null default 0,
  day_period text,
  created_at timestamptz not null default now(),
  unique (plan_date, doctor_id)
);

create index if not exists daily_plan_manual_stops_date_idx
  on daily_plan_manual_stops(plan_date, sort_order);
