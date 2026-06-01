alter table orders
add column if not exists insurance_reviewed_at timestamptz;
