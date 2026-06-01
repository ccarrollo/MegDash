-- Order totals + multiple payment lines per order

alter table orders
  add column if not exists order_total numeric(12, 2),
  add column if not exists insurance_expected numeric(12, 2),
  add column if not exists patient_responsibility_total numeric(12, 2);

alter table sales_records
  add column if not exists payment_source text;

drop index if exists sales_records_order_id_idx;

create index if not exists sales_records_order_id_idx
  on sales_records(order_id, payment_year, payment_month);
