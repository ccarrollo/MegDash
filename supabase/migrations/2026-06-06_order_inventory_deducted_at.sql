alter table orders
  add column if not exists inventory_deducted_at timestamptz;

