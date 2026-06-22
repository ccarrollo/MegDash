alter table monthly_goals
  add column if not exists wholesale_sales numeric(12, 2) not null default 0;
