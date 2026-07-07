-- Profiles: one row per auth user, created automatically by trigger whenever a
-- user registers (self-signup or admin-created). The role column is a
-- DISPLAY-ONLY mirror of app_metadata — authorization always uses is_admin()
-- reading the JWT, never this table.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  role text not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth → profiles sync triggers
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER is required: the auth admin role that inserts into
-- auth.users has no rights on public. Locked down: empty search_path and
-- EXECUTE revoked from every client-facing role (trigger-only).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_app_meta_data ->> 'role', 'player')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email,
      role = coalesce(new.raw_app_meta_data ->> 'role', role)
  where id = new.id;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_updated() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_updated
  after update of email, raw_app_meta_data on auth.users
  for each row execute function public.handle_user_updated();

-- ---------------------------------------------------------------------------
-- RLS + grants (S1, S7, L13)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "admin all profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.profiles to authenticated;
-- Column-level: users can never change their own email/role through the API.
grant update (full_name, phone) on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- Point players at profiles (was auth.users) and backfill existing users
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  coalesce(raw_app_meta_data ->> 'role', 'player')
from auth.users
on conflict (id) do nothing;

alter table public.players drop constraint players_profile_id_fkey;
alter table public.players add constraint players_profile_id_fkey
  foreign key (profile_id) references public.profiles (id) on delete set null;
