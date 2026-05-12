-- App profile per auth user: flags + subscription fields without modifying auth.users.
-- Run in Supabase SQL editor.
-- To grant moderation (Approvals link + `/admin/styles`): run `supabase/promote_umairmanzoor_admin_verified.sql`
-- then `supabase/rls_subtitle_styles_moderator_profiles.sql` so pending styles + approve/reject honor `user_profiles.is_admin`.
-- OAuth secrets (Google / X) stay in Supabase Dashboard → Authentication → Providers only.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  verified boolean not null default false,
  subscription_tier text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_subscription_idx
  on public.user_profiles (subscription_tier);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create or replace function public.touch_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_touch_updated_at on public.user_profiles;
create trigger user_profiles_touch_updated_at
  before update on public.user_profiles
  for each row execute function public.touch_user_profiles_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, verified)
  values (new.id, new.email_confirmed_at is not null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Manual admin (SQL Editor): update public.user_profiles set is_admin = true, verified = true where id = '<uuid from Authentication → Users>';
