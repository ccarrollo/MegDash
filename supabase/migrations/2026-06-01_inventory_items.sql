create table if not exists inventory_items (
  stim_id text primary key,
  quantity int not null default 0,
  updated_at timestamptz not null default now()
);

insert into inventory_items (stim_id, quantity)
values
  ('5313', 0),
  ('5314', 0),
  ('5315', 0),
  ('5302', 0),
  ('5303', 0)
on conflict (stim_id) do nothing;
