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
