-- Self-serve open play, part 2: stacking onto courts, the follow graph, and invites.
--
-- A match is now a court roster with a lifecycle:
--   forming  → the court is claimed, seats are open, players stack in
--   active   → roster hit capacity, the clock runs, everyone was charged
--   completed/cancelled
-- 'forming' holds the court exactly like 'active' does, so a half-full court is
-- never handed to the matchmaker (L6 extended).

-- ---------------------------------------------------------------------------
-- Matches become stackable rosters
-- ---------------------------------------------------------------------------
alter table public.matches
  add column capacity integer not null default 4 check (capacity in (2, 4)),
  add column open_to_stacking boolean not null default true,
  -- L18: a forming roster cannot squat a court forever.
  add column forming_expires_at timestamptz;

alter table public.matches alter column ends_at drop not null;
alter table public.matches
  add constraint matches_active_has_end check (status <> 'active' or ends_at is not null);

drop index public.one_active_match_per_court;

create unique index one_live_match_per_court
  on public.matches (court_id)
  where status in ('forming', 'active');

create index matches_forming_sweep
  on public.matches (forming_expires_at)
  where status = 'forming';

alter table public.match_players
  add column source public.match_player_source not null default 'walk_in',
  add column joined_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Roster guard (L19, L20)
-- ---------------------------------------------------------------------------
-- `for update` on the match row serializes concurrent stackers, so a 4-seat
-- court can never take a 5th player no matter how the requests interleave.
-- Custom SQLSTATEs let the controller map failures to precise HTTP responses.
create or replace function public.guard_match_player_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_status public.match_status;
  v_taken integer;
begin
  select m.capacity, m.status
  into v_capacity, v_status
  from public.matches m
  where m.id = new.match_id
  for update;

  if v_status is null or v_status not in ('forming', 'active') then
    raise exception 'match % is not accepting players', new.match_id
      using errcode = 'PB003';
  end if;

  select count(*) into v_taken
  from public.match_players mp
  where mp.match_id = new.match_id;

  -- L19: never exceed capacity, and never a roster of 3 (capacity is 2 or 4).
  if v_taken >= v_capacity then
    raise exception 'match % is full', new.match_id using errcode = 'PB001';
  end if;

  -- L20: a player occupies at most one live court, so their credits can never
  -- be committed to two matches at once.
  if exists (
    select 1
    from public.match_players mp
    join public.matches m on m.id = mp.match_id
    where mp.player_id = new.player_id
      and mp.match_id <> new.match_id
      and m.status in ('forming', 'active')
  ) then
    raise exception 'player % is already on a live court', new.player_id
      using errcode = 'PB002';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_match_player_insert() from public, anon, authenticated;

create trigger match_players_roster_guard
  before insert on public.match_players
  for each row execute function public.guard_match_player_insert();

-- ---------------------------------------------------------------------------
-- Follow graph — you may only invite someone you follow (P11)
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.players (id) on delete cascade,
  followee_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);

create index follows_by_followee on public.follows (followee_id);

-- ---------------------------------------------------------------------------
-- Match invites
-- ---------------------------------------------------------------------------
create table public.match_invites (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  inviter_id uuid not null references public.players (id) on delete cascade,
  invitee_id uuid not null references public.players (id) on delete cascade,
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_invites_no_self check (inviter_id <> invitee_id)
);

-- L21: no invite spam — one live invite per (match, invitee).
create unique index one_pending_invite_per_match_invitee
  on public.match_invites (match_id, invitee_id)
  where status = 'pending';

create index match_invites_inbox on public.match_invites (invitee_id, status);

create trigger match_invites_updated_at before update on public.match_invites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (S1, S12)
-- ---------------------------------------------------------------------------
alter table public.follows enable row level security;
alter table public.match_invites enable row level security;

-- Your follow graph is yours: you see edges you are an endpoint of.
create policy "players read own follow graph" on public.follows
  for select to authenticated
  using (
    follower_id = public.current_player_id()
    or followee_id = public.current_player_id()
  );
create policy "players follow as themselves" on public.follows
  for insert to authenticated
  with check (follower_id = public.current_player_id());
create policy "players unfollow their own" on public.follows
  for delete to authenticated
  using (follower_id = public.current_player_id());
create policy "admin all follows" on public.follows
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Invites are readable by both endpoints. Writes go through the API only:
-- accepting an invite has to check credits and roster capacity atomically,
-- which a WITH CHECK expression cannot do.
create policy "players read own invites" on public.match_invites
  for select to authenticated
  using (
    inviter_id = public.current_player_id()
    or invitee_id = public.current_player_id()
  );
create policy "admin all invites" on public.match_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.follows to authenticated;
grant select on public.match_invites to authenticated;
grant all on public.follows, public.match_invites to service_role;

-- ---------------------------------------------------------------------------
-- Realtime (S10): the player hub live-updates its invite inbox and balance.
-- Both tables are RLS-scoped to the owner, so subscribers only receive rows
-- they are already allowed to select.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.match_invites,
  public.player_credits;
