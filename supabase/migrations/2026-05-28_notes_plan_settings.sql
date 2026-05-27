alter table doctors add column if not exists interaction_notes text;

alter table notes add column if not exists category text;

create table if not exists daily_plan_settings (
  plan_date date primary key,
  prospect_count int not null default 6,
  updated_at timestamptz not null default now()
);

-- Copy interaction notes from timeline into doctor row when empty
update doctors d
set interaction_notes = sub.bodies
from (
  select
    doctor_id,
    string_agg(body, E'\n\n---\n\n' order by created_at) as bodies
  from notes
  group by doctor_id
) sub
where d.id = sub.doctor_id
  and (d.interaction_notes is null or trim(d.interaction_notes) = '')
  and sub.bodies is not null;

update doctors d
set front_desk_notes = sub.body
from (
  select distinct on (doctor_id) doctor_id, body
  from notes
  where category = 'front_desk'
  order by doctor_id, created_at
) sub
where d.id = sub.doctor_id
  and (d.front_desk_notes is null or trim(d.front_desk_notes) = '');
