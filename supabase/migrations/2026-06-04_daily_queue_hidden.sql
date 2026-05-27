alter table doctors
add column if not exists daily_queue_hidden boolean not null default false;
