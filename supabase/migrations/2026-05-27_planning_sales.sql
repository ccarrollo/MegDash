-- Run in Supabase SQL Editor

alter table lunches add column if not exists restaurant text;
alter table lunches add column if not exists total_cost numeric(10, 2);
alter table lunches add column if not exists cost_per_head numeric(10, 2);

create table if not exists daily_plan_anchors (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  doctor_id uuid references doctors(id) on delete cascade,
  facility_id uuid references facilities(id) on delete set null,
  anchor_time time,
  anchor_type text not null default 'lunch',
  label text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists daily_plan_anchors_date_idx on daily_plan_anchors(plan_date);

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

create index if not exists daily_plan_stop_times_date_idx on daily_plan_stop_times(plan_date);

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
  product text,
  status text not null default 'pending',
  notes text,
  amount numeric(12, 2),
  source text not null default 'app',
  created_at timestamptz not null default now()
);

create index orders_doctor_idx on orders(doctor_id);
create index orders_ordered_at_idx on orders(ordered_at desc);

drop view if exists doctors_with_last_visit;

create view doctors_with_last_visit as
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
  a.last_activity_at,
  (d.manual_last_visit_date is not null) as is_last_visit_overridden,
  case
    when coalesce(d.manual_last_visit_date::timestamptz, v.last_visit_at) is null then null
    else (current_date - coalesce(d.manual_last_visit_date::timestamptz, v.last_visit_at)::date)
  end as days_since_visit,
  case
    when a.last_activity_at is null then null
    else (current_date - a.last_activity_at::date)
  end as days_since_activity
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
      'visited',
      'visit',
      'lunch'
    )
) v on true
left join lateral (
  select max(visited_at) as last_activity_at
  from visits
  where doctor_id = d.id
) a on true;

-- Normalize legacy visit outcomes from import / early logging
update visits
set outcome = 'visited_success'
where outcome in ('visited', 'visit', 'lunch');
