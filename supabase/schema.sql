-- Run this once in the Supabase SQL editor before using community styles.
-- After signing in as an admin user, add that user's auth.users.id to style_admins.

create extension if not exists pgcrypto;

create table if not exists public.subtitle_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text not null default '',
  base_style text not null,
  typography jsonb not null default '{}'::jsonb,
  behavior jsonb not null default '{}'::jsonb,
  kind text not null default 'settings' check (kind in ('settings', 'code')),
  code text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  author_name text not null default 'Creator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subtitle_style_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  style_id uuid not null references public.subtitle_styles(id) on delete cascade,
  imported_at timestamptz not null default now(),
  unique (user_id, style_id)
);

create table if not exists public.style_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.subtitle_styles
  add column if not exists behavior jsonb not null default '{}'::jsonb;

alter table public.subtitle_styles
  add column if not exists kind text not null default 'settings'
  check (kind in ('settings', 'code'));

alter table public.subtitle_styles
  add column if not exists code text;

create index if not exists subtitle_styles_status_created_idx
  on public.subtitle_styles(status, created_at desc);

create index if not exists subtitle_style_imports_user_idx
  on public.subtitle_style_imports(user_id, imported_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subtitle_styles_touch_updated_at on public.subtitle_styles;
create trigger subtitle_styles_touch_updated_at
before update on public.subtitle_styles
for each row execute function public.touch_updated_at();

alter table public.subtitle_styles enable row level security;
alter table public.subtitle_style_imports enable row level security;
alter table public.style_admins enable row level security;

drop policy if exists "read approved own or admin styles" on public.subtitle_styles;
create policy "read approved own or admin styles"
on public.subtitle_styles for select
using (
  status = 'approved'
  or user_id = auth.uid()
  or exists (
    select 1 from public.style_admins admin
    where admin.user_id = auth.uid()
  )
);

drop policy if exists "create own pending styles" on public.subtitle_styles;
create policy "create own pending styles"
on public.subtitle_styles for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
);

drop policy if exists "admins approve styles" on public.subtitle_styles;
create policy "admins approve styles"
on public.subtitle_styles for update
using (
  exists (
    select 1 from public.style_admins admin
    where admin.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.style_admins admin
    where admin.user_id = auth.uid()
  )
);

drop policy if exists "read own imports" on public.subtitle_style_imports;
create policy "read own imports"
on public.subtitle_style_imports for select
using (auth.uid() = user_id);

drop policy if exists "import approved or own styles" on public.subtitle_style_imports;
create policy "import approved or own styles"
on public.subtitle_style_imports for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.subtitle_styles style
    where style.id = style_id
    and (style.status = 'approved' or style.user_id = auth.uid())
  )
);

drop policy if exists "remove own imports" on public.subtitle_style_imports;
create policy "remove own imports"
on public.subtitle_style_imports for delete
using (auth.uid() = user_id);

drop policy if exists "admins read own admin row" on public.style_admins;
create policy "admins read own admin row"
on public.style_admins for select
using (auth.uid() = user_id);

-- Example after you know the admin user's auth id:
-- insert into public.style_admins (user_id) values ('00000000-0000-0000-0000-000000000000');

-- Allow owners to edit their own pending/rejected styles and resubmit for approval.
-- Owners can ONLY set status back to 'pending' (cannot self-approve).
drop policy if exists "owners edit own non-approved styles" on public.subtitle_styles;
create policy "owners edit own non-approved styles"
on public.subtitle_styles for update
using (
  auth.uid() = user_id
  and status in ('pending', 'rejected')
)
with check (
  auth.uid() = user_id
  and status = 'pending'
);
