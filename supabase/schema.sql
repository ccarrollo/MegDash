-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

-- App settings (home base, drive limits)
create table if not exists app_settings (
  id int primary key default 1 check (id = 1),
  home_address text not null default '8100 S Congress Ave, Austin, TX 78745',
  home_lat double precision,
  home_lng double precision,
  max_minutes_between_stops int not null default 25,
  max_minutes_from_home int not null default 60,
  updated_at timestamptz not null default now()
);

insert into app_settings (id) values (1) on conflict do nothing;

-- Geographic zones for territory-aware planning
create type territory_zone as enum (
  'austin_core',
  'north_nw',
  'south_i35',
  'east',
  'waco_central',
  'west_rural',
  'unknown'
);

create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text,
  zip text,
  location_label text,
  zone territory_zone not null default 'unknown',
  lat double precision,
  lng double precision,
  office_vibe text,
  created_at timestamptz not null default now(),
  unique (name, address)
);

create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  name text not null,
  primary_focus text,
  status text not null default '2. Introduced',
  decision_makers text,
  other_names text,
  lunch_scheduled boolean not null default false,
  lunch_date date,
  front_desk_in boolean default false,
  marketing_kit boolean default false,
  follow_up_date date,
  order_history text,
  front_desk_notes text,
  competitor_notes text,
  manual_last_visit_date date,
  follow_up_lunch text,
  interaction_notes text,
  photo_path text,
  daily_queue_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index doctors_facility_idx on doctors(facility_id);
create index doctors_lunch_date_idx on doctors(lunch_date);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  visited_at timestamptz not null default now(),
  outcome text not null default 'visited',
  note text,
  created_at timestamptz not null default now()
);

create index visits_doctor_idx on visits(doctor_id);
create index visits_visited_at_idx on visits(visited_at desc);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  body text not null,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists daily_plan_settings (
  plan_date date primary key,
  prospect_count int not null default 6,
  auto_suggestions boolean not null default true,
  updated_at timestamptz not null default now()
);

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

create index daily_plan_manual_stops_date_idx on daily_plan_manual_stops(plan_date, sort_order);

create index notes_doctor_idx on notes(doctor_id);

create table if not exists lunches (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  lunch_date date not null,
  start_time time,
  headcount int,
  food_notes text,
  lunch_order text,
  restaurant text,
  total_cost numeric(10, 2),
  cost_per_head numeric(10, 2),
  interaction_notes text,
  status text not null default 'scheduled',
  is_date_tbd boolean not null default false,
  created_at timestamptz not null default now()
);

create index lunches_date_idx on lunches(lunch_date);

create table if not exists daily_plan_anchors (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  doctor_id uuid references doctors(id) on delete cascade,
  facility_id uuid references facilities(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  anchor_time time,
  anchor_type text not null default 'lunch',
  label text,
  patient_name text,
  manual_address text,
  restaurant text,
  food_notes text,
  interaction_notes text,
  headcount int,
  total_cost numeric(10, 2),
  cost_per_head numeric(10, 2),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index daily_plan_anchors_date_idx on daily_plan_anchors(plan_date);

create table if not exists daily_plan_stop_times (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  doctor_id uuid not null references doctors(id) on delete cascade,
  stop_kind text not null,
  start_time time not null,
  end_time time,
  created_at timestamptz not null default now(),
  unique (plan_date, doctor_id, stop_kind)
);

create table if not exists inventory_items (
  stim_id text primary key,
  quantity int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists sales_goals (
  id uuid primary key default gen_random_uuid(),
  period_year int not null,
  period_month int not null,
  label text not null,
  target_units int,
  actual_units int default 0,
  target_revenue numeric(12, 2),
  actual_revenue numeric(12, 2) default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (period_year, period_month, label)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  visit_id uuid references visits(id) on delete set null,
  ordered_at timestamptz not null default now(),
  insurance_reviewed_at timestamptz,
  fitting_address text,
  product text,
  status text not null default 'pending',
  notes text,
  amount numeric(12, 2),
  source text not null default 'app',
  created_at timestamptz not null default now()
);

-- View: last visit per doctor (physical outcomes + legacy import values)
create or replace view doctors_with_last_visit as
select
  d.*,
  f.name as facility_name,
  f.address,
  f.city,
  f.location_label,
  f.zone,
  f.lat,
  f.lng,
  f.office_vibe as facility_office_vibe,
  coalesce(d.manual_last_visit_date::timestamptz, v.last_visit_at) as last_visit_at,
  c.last_contact_at,
  (d.manual_last_visit_date is not null) as is_last_visit_overridden,
  case
    when coalesce(d.manual_last_visit_date::timestamptz, v.last_visit_at) is null then null
    else (current_date - coalesce(d.manual_last_visit_date::timestamptz, v.last_visit_at)::date)
  end as days_since_visit,
  case
    when c.last_contact_at is null then null
    else (current_date - c.last_contact_at::date)
  end as days_since_contact
from doctors d
join facilities f on f.id = d.facility_id
left join lateral (
  select max(visited_at) as last_visit_at
  from visits
  where doctor_id = d.id
    and outcome in (
      'visited_success',
      'visited_brief',
      'lunch_completed',
      'coffee_dropoff',
      'office_visit',
      'in_person_visit',
      'visited',
      'visit',
      'lunch'
    )
) v on true
left join lateral (
  select max(visited_at) as last_contact_at
  from visits
  where doctor_id = d.id
    and outcome in (
      'visited_success',
      'visited_brief',
      'lunch_completed',
      'coffee_dropoff',
      'office_visit',
      'in_person_visit',
      'remote_contact',
      'visited',
      'visit',
      'lunch'
    )
) c on true;
