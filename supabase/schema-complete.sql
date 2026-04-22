-- Complete rebuild schema for the FinancePWA app.
-- Intended for a fresh Supabase project or a full reset.
-- Run this in the Supabase SQL editor after the project is created.

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

create table if not exists public.salary_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  annual_gross_salary numeric(12, 2) not null check (annual_gross_salary >= 0),
  tax_region text not null default 'england_wales_ni' check (tax_region in ('england_wales_ni', 'scotland')),
  student_loan_plan text not null default 'none' check (student_loan_plan in ('none', 'plan1', 'plan2', 'plan4', 'plan5')),
  postgraduate_loan boolean not null default false,
  tax_code text not null default '1257L',
  first_payment_date date,
  payment_frequency text not null default 'monthly' check (payment_frequency in ('monthly', 'weekly', 'biweekly')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, profile_id)
);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  type text not null check (type in ('income', 'expense')),
  category_id uuid not null references public.categories (id) on delete restrict,
  frequency text not null check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  interval_value integer not null default 1 check (interval_value >= 1),
  start_date date not null,
  end_date date,
  next_run_date date,
  created_by uuid not null references public.profiles (id) on delete restrict,
  mode text not null default 'auto_add' check (mode in ('auto_add', 'predict_only')),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  description text not null,
  transaction_date date not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  salary_profile_id uuid references public.salary_profiles (id) on delete set null,
  recurring_transaction_id uuid references public.recurring_transactions (id) on delete set null,
  generated_source text,
  is_prediction boolean not null default false,
  split_mode text not null default 'none' check (split_mode in ('none', 'even', 'custom')),
  split_participants integer not null default 1 check (split_participants >= 1),
  split_amount numeric(12, 2) check (split_amount is null or split_amount >= 0),
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

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  linked_savings_goal_id uuid references public.savings_goals (id) on delete set null,
  target_date date,
  created_by uuid not null references public.profiles (id) on delete restrict,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.savings_goal_entries (
  id uuid primary key default gen_random_uuid(),
  savings_goal_id uuid not null references public.savings_goals (id) on delete cascade,
  amount_delta numeric(12, 2) not null,
  entry_date date not null default current_date,
  note text not null default '',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transaction_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#5b7cfa',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, name)
);

create table if not exists public.transaction_tag_map (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  tag_id uuid not null references public.transaction_tags (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (transaction_id, tag_id)
);

create table if not exists public.transaction_history (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  action text not null check (action in ('created', 'updated', 'deleted')),
  snapshot jsonb not null default '{}'::jsonb,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_workspace_members_user_id
  on public.workspace_members (user_id);

create index if not exists idx_categories_workspace_id
  on public.categories (workspace_id);

create index if not exists idx_savings_goals_workspace_id
  on public.savings_goals (workspace_id);

create index if not exists idx_salary_profiles_workspace_id
  on public.salary_profiles (workspace_id);

create index if not exists idx_recurring_transactions_workspace_id
  on public.recurring_transactions (workspace_id);

create index if not exists idx_transactions_workspace_id
  on public.transactions (workspace_id);

create index if not exists idx_transactions_transaction_date
  on public.transactions (transaction_date desc);

create index if not exists idx_transactions_salary_profile_id
  on public.transactions (salary_profile_id);

create unique index if not exists idx_transactions_unique_recurring_date
  on public.transactions (recurring_transaction_id, transaction_date)
  where recurring_transaction_id is not null;

create index if not exists idx_budgets_workspace_id
  on public.budgets (workspace_id);

create index if not exists idx_wishlist_items_workspace_id
  on public.wishlist_items (workspace_id);

create index if not exists idx_savings_goal_entries_goal_id
  on public.savings_goal_entries (savings_goal_id);

create index if not exists idx_transaction_history_workspace_id
  on public.transaction_history (workspace_id, created_at desc);

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

create or replace function public.adjust_savings_goal(
  target_goal_id uuid,
  delta numeric,
  adjustment_note text default '',
  adjustment_date date default current_date
)
returns public.savings_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  goal_row public.savings_goals;
begin
  select *
  into goal_row
  from public.savings_goals
  where id = target_goal_id;

  if goal_row.id is null then
    raise exception 'Savings goal not found';
  end if;

  if not public.is_workspace_member(goal_row.workspace_id) then
    raise exception 'Not allowed to adjust this savings goal';
  end if;

  if goal_row.current_amount + delta < 0 then
    raise exception 'Savings pot cannot go below zero';
  end if;

  update public.savings_goals
  set current_amount = current_amount + delta
  where id = target_goal_id
  returning * into goal_row;

  insert into public.savings_goal_entries (
    savings_goal_id,
    amount_delta,
    entry_date,
    note,
    created_by
  )
  values (
    target_goal_id,
    delta,
    adjustment_date,
    coalesce(adjustment_note, ''),
    auth.uid()
  );

  return goal_row;
end;
$$;

grant execute on function public.adjust_savings_goal(uuid, numeric, text, date) to authenticated;

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

drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute procedure public.set_updated_at();

drop trigger if exists salary_profiles_set_updated_at on public.salary_profiles;
create trigger salary_profiles_set_updated_at
before update on public.salary_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists recurring_transactions_set_updated_at on public.recurring_transactions;
create trigger recurring_transactions_set_updated_at
before update on public.recurring_transactions
for each row execute procedure public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute procedure public.set_updated_at();

drop trigger if exists wishlist_items_set_updated_at on public.wishlist_items;
create trigger wishlist_items_set_updated_at
before update on public.wishlist_items
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.categories enable row level security;
alter table public.savings_goals enable row level security;
alter table public.salary_profiles enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.savings_goal_entries enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.transaction_tag_map enable row level security;
alter table public.transaction_history enable row level security;

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

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

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

drop policy if exists "recurring_transactions_select_members" on public.recurring_transactions;
create policy "recurring_transactions_select_members"
on public.recurring_transactions
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "recurring_transactions_insert_members" on public.recurring_transactions;
create policy "recurring_transactions_insert_members"
on public.recurring_transactions
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "recurring_transactions_update_members" on public.recurring_transactions;
create policy "recurring_transactions_update_members"
on public.recurring_transactions
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "recurring_transactions_delete_members" on public.recurring_transactions;
create policy "recurring_transactions_delete_members"
on public.recurring_transactions
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

drop policy if exists "wishlist_items_select_members" on public.wishlist_items;
create policy "wishlist_items_select_members"
on public.wishlist_items
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "wishlist_items_insert_members" on public.wishlist_items;
create policy "wishlist_items_insert_members"
on public.wishlist_items
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

drop policy if exists "wishlist_items_update_members" on public.wishlist_items;
create policy "wishlist_items_update_members"
on public.wishlist_items
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "wishlist_items_delete_members" on public.wishlist_items;
create policy "wishlist_items_delete_members"
on public.wishlist_items
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "savings_goal_entries_select_members" on public.savings_goal_entries;
create policy "savings_goal_entries_select_members"
on public.savings_goal_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.savings_goals sg
    where sg.id = savings_goal_entries.savings_goal_id
      and public.is_workspace_member(sg.workspace_id)
  )
);

drop policy if exists "savings_goal_entries_insert_members" on public.savings_goal_entries;
create policy "savings_goal_entries_insert_members"
on public.savings_goal_entries
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.savings_goals sg
    where sg.id = savings_goal_entries.savings_goal_id
      and public.is_workspace_member(sg.workspace_id)
  )
);

drop policy if exists "transaction_tags_select_members" on public.transaction_tags;
create policy "transaction_tags_select_members"
on public.transaction_tags
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "transaction_tags_insert_members" on public.transaction_tags;
create policy "transaction_tags_insert_members"
on public.transaction_tags
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "transaction_tag_map_select_members" on public.transaction_tag_map;
create policy "transaction_tag_map_select_members"
on public.transaction_tag_map
for select
to authenticated
using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_tag_map.transaction_id
      and public.is_workspace_member(t.workspace_id)
  )
);

drop policy if exists "transaction_tag_map_insert_members" on public.transaction_tag_map;
create policy "transaction_tag_map_insert_members"
on public.transaction_tag_map
for insert
to authenticated
with check (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_tag_map.transaction_id
      and public.is_workspace_member(t.workspace_id)
  )
);

drop policy if exists "transaction_tag_map_delete_members" on public.transaction_tag_map;
create policy "transaction_tag_map_delete_members"
on public.transaction_tag_map
for delete
to authenticated
using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_tag_map.transaction_id
      and public.is_workspace_member(t.workspace_id)
  )
);

drop policy if exists "transaction_history_select_members" on public.transaction_history;
create policy "transaction_history_select_members"
on public.transaction_history
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "transaction_history_insert_members" on public.transaction_history;
create policy "transaction_history_insert_members"
on public.transaction_history
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and changed_by = auth.uid()
);

commit;
