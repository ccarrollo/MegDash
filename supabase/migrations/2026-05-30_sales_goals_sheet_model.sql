-- Align sales/goals with Meg AI Dash sheet (My Sales $, 3PP vs wholesale, AS/PS goals)

alter table monthly_goals
  add column if not exists accel_goal numeric(12, 2) not null default 0,
  add column if not exists physio_goal numeric(12, 2) not null default 0;

-- Legacy unit_goal: if set and new goals are zero, treat as total 3PP goal on accel only
update monthly_goals
set accel_goal = unit_goal
where unit_goal > 0 and accel_goal = 0 and physio_goal = 0;

alter table sales_records
  add column if not exists my_sales_amount numeric(12, 2),
  add column if not exists channel text not null default '3pp',
  add column if not exists actual_cost numeric(12, 2),
  add column if not exists insurance text,
  add column if not exists affected_bone text;

update sales_records
set my_sales_amount = coalesce(my_sales_amount, revenue, 0)
where my_sales_amount is null;

alter table orders
  add column if not exists channel text not null default '3pp',
  add column if not exists my_sales_amount numeric(12, 2),
  add column if not exists actual_cost numeric(12, 2),
  add column if not exists entered_at date,
  add column if not exists insurance text,
  add column if not exists affected_bone text;

create index if not exists sales_records_channel_payment_idx
  on sales_records(payment_year, payment_month, channel);
