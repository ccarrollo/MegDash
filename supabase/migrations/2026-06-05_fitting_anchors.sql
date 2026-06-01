alter table daily_plan_anchors
add column if not exists order_id uuid references orders(id) on delete set null;

alter table daily_plan_anchors
add column if not exists patient_name text;

alter table daily_plan_anchors
add column if not exists manual_address text;
