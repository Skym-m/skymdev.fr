create extension if not exists pgcrypto;

create table if not exists public.global_super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.global_super_admin_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references auth.users (id) on delete set null,
  target_user_id uuid null references auth.users (id) on delete set null,
  event_type text not null,
  reason text null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.global_super_admins enable row level security;
alter table public.global_super_admin_events enable row level security;

create policy global_super_admins_self_read
  on public.global_super_admins
  for select
  to authenticated
  using (user_id = auth.uid() and is_active = true);

create policy global_super_admin_events_no_client_access
  on public.global_super_admin_events
  for select
  to authenticated
  using (false);
