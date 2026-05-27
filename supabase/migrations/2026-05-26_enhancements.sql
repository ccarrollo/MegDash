-- Run in Supabase SQL Editor (safe to re-run parts with IF NOT EXISTS)

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
  (d.manual_last_visit_date is not null) as is_last_visit_overridden,
  case
    when coalesce(d.manual_last_visit_date::timestamptz, v.last_visit_at) is null then null
    else (current_date - coalesce(d.manual_last_visit_date::timestamptz, v.last_visit_at)::date)
  end as days_since_visit
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
      'office_visit'
    )
) v on true;
