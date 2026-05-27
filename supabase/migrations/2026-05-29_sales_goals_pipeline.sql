-- Monthly goals + paid sales records for commission tracking

alter table orders add column if not exists pipeline_stage text not null default 'order_received';
alter table orders add column if not exists patient_label text;
alter table orders add column if not exists fitted_at timestamptz;
alter table orders add column if not exists payment_year int;
alter table orders add column if not exists payment_month int;
alter table orders add column if not exists insurance_notes text;
alter table orders add column if not exists counts_as_sale boolean not null default false;

create table if not exists monthly_goals (
  period_year int not null,
  period_month int not null,
  unit_goal int not null default 0,
  revenue_per_unit numeric(12, 2),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (period_year, period_month)
);

create table if not exists sales_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  doctor_id uuid references doctors(id) on delete set null,
  facility_id uuid references facilities(id) on delete set null,
  patient_label text,
  order_date date,
  fitted_date date,
  payment_year int not null,
  payment_month int not null,
  revenue numeric(12, 2),
  product text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists sales_records_payment_idx on sales_records(payment_year, payment_month);

create unique index if not exists sales_records_order_id_idx on sales_records(order_id) where order_id is not null;
