-- Add salary profiles for annual salary and estimated payroll deductions.
-- Run this after the main schema.sql.

begin;

create table if not exists public.salary_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  annual_gross_salary numeric(12, 2) not null check (annual_gross_salary >= 0),
  tax_region text not null default 'england_wales_ni' check (tax_region in ('england_wales_ni', 'scotland')),
  student_loan_plan text not null default 'none' check (student_loan_plan in ('none', 'plan1', 'plan2', 'plan4', 'plan5')),
  postgraduate_loan boolean not null default false,
  tax_code text not null default '1257L',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, profile_id)
);

create index if not exists idx_salary_profiles_workspace_id
  on public.salary_profiles (workspace_id);

drop trigger if exists salary_profiles_set_updated_at on public.salary_profiles;
create trigger salary_profiles_set_updated_at
before update on public.salary_profiles
for each row execute procedure public.set_updated_at();

alter table public.salary_profiles enable row level security;

drop policy if exists "salary_profiles_select_members" on public.salary_profiles;
create policy "salary_profiles_select_members"
on public.salary_profiles
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "salary_profiles_insert_own_profile" on public.salary_profiles;
create policy "salary_profiles_insert_own_profile"
on public.salary_profiles
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and profile_id = auth.uid()
);

drop policy if exists "salary_profiles_update_own_profile" on public.salary_profiles;
create policy "salary_profiles_update_own_profile"
on public.salary_profiles
for update
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and profile_id = auth.uid()
)
with check (
  public.is_workspace_member(workspace_id)
  and profile_id = auth.uid()
);

drop policy if exists "salary_profiles_delete_own_profile" on public.salary_profiles;
create policy "salary_profiles_delete_own_profile"
on public.salary_profiles
for delete
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and profile_id = auth.uid()
);

commit;
