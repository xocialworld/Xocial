-- feature_waitlist table for capturing interest in upcoming features
create table if not exists public.feature_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_name text not null,
  interested boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists feature_waitlist_user_feature_unique
  on public.feature_waitlist (user_id, feature_name);

alter table public.feature_waitlist enable row level security;

-- Policies: users can insert/update/select their own entries
create policy feature_waitlist_select_own
  on public.feature_waitlist
  for select
  to authenticated
  using (user_id = auth.uid());

create policy feature_waitlist_insert_own
  on public.feature_waitlist
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy feature_waitlist_update_own
  on public.feature_waitlist
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());