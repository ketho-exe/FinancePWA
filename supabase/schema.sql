-- Shared Finance Tracker
-- Run this in the Supabase SQL editor after creating your project.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#6fcf97',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, name, type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  description text not null,
  transaction_date date not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, category_id, month)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) check (target_amount is null or target_amount >= 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  monthly_contribution numeric(12, 2) not null default 0 check (monthly_contribution >= 0),
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_workspace_members_user_id
  on public.workspace_members (user_id);

create index if not exists idx_categories_workspace_id
  on public.categories (workspace_id);

create index if not exists idx_transactions_workspace_id
  on public.transactions (workspace_id);

create index if not exists idx_transactions_transaction_date
  on public.transactions (transaction_date desc);

create index if not exists idx_budgets_workspace_id
  on public.budgets (workspace_id);

create index if not exists idx_savings_goals_workspace_id
  on public.savings_goals (workspace_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute procedure public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute procedure public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute procedure public.set_updated_at();

drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

drop policy if exists "profiles_select_self_or_workspace_members" on public.profiles;
create policy "profiles_select_self_or_workspace_members"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.workspace_members viewer
    join public.workspace_members teammate
      on teammate.workspace_id = viewer.workspace_id
    where viewer.user_id = auth.uid()
      and teammate.user_id = profiles.id
  )
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspaces_select_members" on public.workspaces;
create policy "workspaces_select_members"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists "workspaces_insert_authenticated" on public.workspaces;
create policy "workspaces_insert_authenticated"
on public.workspaces
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "workspaces_update_owners" on public.workspaces;
create policy "workspaces_update_owners"
on public.workspaces
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
);

drop policy if exists "workspace_members_select_members" on public.workspace_members;
create policy "workspace_members_select_members"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_members_insert_owners" on public.workspace_members;
create policy "workspace_members_insert_owners"
on public.workspace_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
  or user_id = auth.uid()
);

drop policy if exists "workspace_members_update_owners" on public.workspace_members;
create policy "workspace_members_update_owners"
on public.workspace_members
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
);

drop policy if exists "categories_select_members" on public.categories;
create policy "categories_select_members"
on public.categories
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "categories_insert_members" on public.categories;
create policy "categories_insert_members"
on public.categories
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "categories_update_members" on public.categories;
create policy "categories_update_members"
on public.categories
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "categories_delete_members" on public.categories;
create policy "categories_delete_members"
on public.categories
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "transactions_select_members" on public.transactions;
create policy "transactions_select_members"
on public.transactions
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "transactions_insert_members" on public.transactions;
create policy "transactions_insert_members"
on public.transactions
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "transactions_update_members" on public.transactions;
create policy "transactions_update_members"
on public.transactions
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "transactions_delete_members" on public.transactions;
create policy "transactions_delete_members"
on public.transactions
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "budgets_select_members" on public.budgets;
create policy "budgets_select_members"
on public.budgets
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "budgets_insert_members" on public.budgets;
create policy "budgets_insert_members"
on public.budgets
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "budgets_update_members" on public.budgets;
create policy "budgets_update_members"
on public.budgets
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "budgets_delete_members" on public.budgets;
create policy "budgets_delete_members"
on public.budgets
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "savings_goals_select_members" on public.savings_goals;
create policy "savings_goals_select_members"
on public.savings_goals
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "savings_goals_insert_members" on public.savings_goals;
create policy "savings_goals_insert_members"
on public.savings_goals
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "savings_goals_update_members" on public.savings_goals;
create policy "savings_goals_update_members"
on public.savings_goals
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "savings_goals_delete_members" on public.savings_goals;
create policy "savings_goals_delete_members"
on public.savings_goals
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

commit;
