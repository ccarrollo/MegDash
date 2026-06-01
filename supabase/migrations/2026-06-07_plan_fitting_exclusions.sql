create table if not exists plan_fitting_exclusions (
  plan_date date not null,
  order_id uuid not null references orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_date, order_id)
);

create index if not exists plan_fitting_exclusions_date_idx
  on plan_fitting_exclusions(plan_date);
