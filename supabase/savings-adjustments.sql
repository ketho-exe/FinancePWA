-- Run this after the main schema.sql.
-- Adds an audit trail plus an RPC for adjusting savings pots safely.

begin;

create table if not exists public.savings_goal_entries (
  id uuid primary key default gen_random_uuid(),
  savings_goal_id uuid not null references public.savings_goals (id) on delete cascade,
  amount_delta numeric(12, 2) not null,
  entry_date date not null default current_date,
  note text not null default '',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_savings_goal_entries_goal_id
  on public.savings_goal_entries (savings_goal_id);

alter table public.savings_goal_entries enable row level security;

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

commit;
