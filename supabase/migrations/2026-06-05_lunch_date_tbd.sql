alter table lunches
add column if not exists is_date_tbd boolean not null default false;
