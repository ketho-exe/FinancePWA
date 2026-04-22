-- Run this after salary-schema.sql to support recurring salary transactions.

begin;

alter table public.salary_profiles
  add column if not exists first_payment_date date,
  add column if not exists payment_frequency text not null default 'monthly'
    check (payment_frequency in ('monthly', 'weekly', 'biweekly'));

alter table public.transactions
  add column if not exists salary_profile_id uuid references public.salary_profiles (id) on delete set null,
  add column if not exists generated_source text;

create index if not exists idx_transactions_salary_profile_id
  on public.transactions (salary_profile_id);

commit;
