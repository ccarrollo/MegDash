-- Remove unused doctor priority field

drop index if exists doctors_priority_idx;

alter table doctors drop column if exists priority;
