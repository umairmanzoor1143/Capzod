-- Run in Supabase SQL Editor after `user_profiles.sql` and `schema.sql` exist.
-- Lets moderators use `user_profiles.is_admin` for the same access as `style_admins`
-- (read pending styles, approve/reject). Keeps `style_admins` as an optional extra list.

create or replace function public.auth_is_style_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.style_admins sa where sa.user_id = (select auth.uid())
  )
  or coalesce(
    (select up.is_admin from public.user_profiles up where up.id = (select auth.uid())),
    false
  );
$$;

grant execute on function public.auth_is_style_moderator() to authenticated;
grant execute on function public.auth_is_style_moderator() to service_role;

create or replace function public.style_admin_author_ids(author_ids uuid[])
returns table (user_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select distinct candidate.user_id
  from unnest(author_ids) as candidate(user_id)
  where exists (
    select 1
    from public.style_admins admin
    where admin.user_id = candidate.user_id
  )
  or exists (
    select 1
    from public.user_profiles profile
    where profile.id = candidate.user_id
      and profile.is_admin = true
  );
$$;

grant execute on function public.style_admin_author_ids(uuid[]) to anon;
grant execute on function public.style_admin_author_ids(uuid[]) to authenticated;
grant execute on function public.style_admin_author_ids(uuid[]) to service_role;

drop policy if exists "read approved own or admin styles" on public.subtitle_styles;
create policy "read approved own or admin styles"
on public.subtitle_styles for select
using (
  status = 'approved'
  or user_id = auth.uid()
  or public.auth_is_style_moderator()
);

drop policy if exists "admins approve styles" on public.subtitle_styles;
create policy "admins approve styles"
on public.subtitle_styles for update
using (public.auth_is_style_moderator())
with check (public.auth_is_style_moderator());
