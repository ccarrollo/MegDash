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
