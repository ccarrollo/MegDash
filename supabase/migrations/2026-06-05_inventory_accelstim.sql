insert into inventory_items (stim_id, quantity)
values ('AccelStim', 0)
on conflict (stim_id) do nothing;
