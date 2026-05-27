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
  priority text not null default 'Medium',
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
  follow_up_lunch text,
  created_at timestamptz not null default now()
);

create index doctors_facility_idx on doctors(facility_id);
create index doctors_priority_idx on doctors(priority);
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
  created_at timestamptz not null default now()
);

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
  interaction_notes text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index lunches_date_idx on lunches(lunch_date);

-- View: last visit per doctor
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
  v.last_visit_at,
  case
    when v.last_visit_at is null then null
    else (current_date - v.last_visit_at::date)
  end as days_since_visit
from doctors d
join facilities f on f.id = d.facility_id
left join lateral (
  select max(visited_at) as last_visit_at
  from visits
  where doctor_id = d.id
) v on true;
