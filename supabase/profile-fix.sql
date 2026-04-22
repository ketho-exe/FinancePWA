-- Allow authenticated users to create their own profile row if it is missing.
-- Run this once in Supabase SQL Editor.

begin;

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

commit;
