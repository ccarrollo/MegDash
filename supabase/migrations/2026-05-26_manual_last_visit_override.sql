alter table doctors
add column if not exists manual_last_visit_date date;

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
) v on true;
