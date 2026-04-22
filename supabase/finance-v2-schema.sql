-- Run this after schema.sql, salary-schema.sql, salary-recurring-schema.sql, and savings-adjustments.sql.
-- Adds recurring transactions, wishlist items, transaction tags, richer transaction metadata, and history.

begin;

alter table public.transactions
  add column if not exists recurring_transaction_id uuid,
  add column if not exists is_prediction boolean not null default false,
  add column if not exists split_mode text not null default 'none'
    check (split_mode in ('none', 'even', 'custom')),
  add column if not exists split_participants integer not null default 1
    check (split_participants >= 1),
  add column if not exists split_amount numeric(12, 2)
    check (split_amount is null or split_amount >= 0);

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

alter table public.transactions
  drop constraint if exists transactions_recurring_transaction_id_fkey;

alter table public.transactions
  add constraint transactions_recurring_transaction_id_fkey
  foreign key (recurring_transaction_id) references public.recurring_transactions (id) on delete set null;

create unique index if not exists idx_transactions_unique_recurring_date
  on public.transactions (recurring_transaction_id, transaction_date)
  where recurring_transaction_id is not null;

create index if not exists idx_recurring_transactions_workspace_id
  on public.recurring_transactions (workspace_id);

drop trigger if exists recurring_transactions_set_updated_at on public.recurring_transactions;
create trigger recurring_transactions_set_updated_at
before update on public.recurring_transactions
for each row execute procedure public.set_updated_at();

alter table public.recurring_transactions enable row level security;

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

create index if not exists idx_wishlist_items_workspace_id
  on public.wishlist_items (workspace_id);

drop trigger if exists wishlist_items_set_updated_at on public.wishlist_items;
create trigger wishlist_items_set_updated_at
before update on public.wishlist_items
for each row execute procedure public.set_updated_at();

alter table public.wishlist_items enable row level security;

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

alter table public.transaction_tags enable row level security;
alter table public.transaction_tag_map enable row level security;

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

create table if not exists public.transaction_history (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  action text not null check (action in ('created', 'updated', 'deleted')),
  snapshot jsonb not null default '{}'::jsonb,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_transaction_history_workspace_id
  on public.transaction_history (workspace_id, created_at desc);

alter table public.transaction_history enable row level security;

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
