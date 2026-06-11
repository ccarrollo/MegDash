-- Monthly coffee tracking roster and delivery log
create table if not exists coffee_roster (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  monthly_goal int not null default 1 check (monthly_goal >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (doctor_id)
);

create table if not exists coffee_deliveries (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  delivered_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists coffee_deliveries_doctor_date_idx
  on coffee_deliveries (doctor_id, delivered_on);

create index if not exists coffee_deliveries_period_idx
  on coffee_deliveries (delivered_on);

-- Snapshot goal per doctor per month for accurate history
create table if not exists coffee_month_goals (
  doctor_id uuid not null references doctors(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  goal int not null default 1 check (goal >= 0),
  primary key (doctor_id, period_year, period_month)
);
