-- Self-serve open play, part 1: player accounts and prepaid playing-time credits.
--
-- Money model (P8): a player buys N hours of playing time. Payment settles
-- through the same signature-verified webhook the bookings flow uses, which
-- credits `minutes_total` into an append-only ledger. The ledger is the only
-- writer of `player_credits.minutes_remaining`, which carries a
-- `>= 0` check constraint — that constraint IS the paywall (L15). Nothing that
-- costs court time can happen without a debit succeeding.

-- ---------------------------------------------------------------------------
-- One player row per registered account
-- ---------------------------------------------------------------------------
-- Walk-ins (staff-created) keep profile_id null; registered users get exactly one.
create unique index players_one_per_profile
  on public.players (profile_id)
  where profile_id is not null;

-- Resolves the calling user to their player row. Used by RLS policies below.
-- Not SECURITY DEFINER: public.players is world-readable, so the invoker can
-- always see the row it needs, and we avoid handing out an escalation surface.
create or replace function public.current_player_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select p.id
  from public.players p
  where p.profile_id = (select auth.uid())
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Credits: purchases, ledger, balance
-- ---------------------------------------------------------------------------
create table public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  reference_code text not null unique,
  status public.play_session_status not null default 'pending_payment',
  hours_purchased integer not null check (hours_purchased between 1 and 8),
  minutes_total integer not null check (minutes_total > 0),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'PHP',
  expires_at timestamptz,   -- checkout hold; only meaningful while pending_payment
  activated_at timestamptz, -- when payment settled
  valid_until timestamptz,  -- minutes stop being spendable after this instant
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- L14: one checkout in flight per player. Without this a player can spam
-- pending passes and the "which pass am I paying for?" UI becomes ambiguous.
create unique index one_pending_play_session_per_player
  on public.play_sessions (player_id)
  where status = 'pending_payment';

create index play_sessions_by_player on public.play_sessions (player_id, status);

-- Materialized balance. Only public.apply_credit_ledger() writes this.
create table public.player_credits (
  player_id uuid primary key references public.players (id) on delete cascade,
  minutes_remaining integer not null default 0 check (minutes_remaining >= 0),
  updated_at timestamptz not null default now()
);

create table public.play_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  play_session_id uuid references public.play_sessions (id) on delete set null,
  match_id uuid references public.matches (id) on delete set null,
  minutes_delta integer not null check (minutes_delta <> 0),
  reason public.credit_reason not null,
  created_at timestamptz not null default now()
);

create index play_credit_ledger_by_player
  on public.play_credit_ledger (player_id, created_at desc);

-- L16: a match charges each player exactly once, however many times the
-- "start the match" path is retried.
create unique index one_debit_per_player_per_match
  on public.play_credit_ledger (player_id, match_id)
  where reason = 'match_debit';

-- Every player owns exactly one balance row from the moment they exist, so the
-- ledger only ever has to UPDATE it.
create or replace function public.ensure_player_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_credits (player_id)
  values (new.id)
  on conflict (player_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.ensure_player_credits() from public, anon, authenticated;

create trigger players_ensure_credits
  after insert on public.players
  for each row execute function public.ensure_player_credits();

-- The UPDATE takes a row lock on player_credits, so concurrent debits serialize
-- and the `>= 0` check rejects the one that would overdraw.
--
-- This deliberately does NOT use `insert ... on conflict do update`: Postgres
-- evaluates CHECK constraints against the *proposed* insert tuple before it
-- resolves the conflict, so a negative delta would fail the check even when the
-- balance row already exists and the arithmetic would have landed on zero.
create or replace function public.apply_credit_ledger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.player_credits pc
  set minutes_remaining = pc.minutes_remaining + new.minutes_delta,
      updated_at = now()
  where pc.player_id = new.player_id;

  if not found then
    insert into public.player_credits (player_id, minutes_remaining)
    values (new.player_id, new.minutes_delta);
  end if;

  return new;
end;
$$;

revoke execute on function public.apply_credit_ledger() from public, anon, authenticated;

create trigger play_credit_ledger_applies_balance
  after insert on public.play_credit_ledger
  for each row execute function public.apply_credit_ledger();

-- ---------------------------------------------------------------------------
-- Lazy expiry sweep (L17)
-- ---------------------------------------------------------------------------
-- There is no cron in local dev, so controllers call this before any read or
-- write that depends on a balance — the same lazy pattern as expireStaleBookings.
-- A player's minutes die when they hold no unexpired active pass.
create or replace function public.expire_play_credits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_swept integer := 0;
begin
  update public.play_sessions
  set status = case
    when status = 'pending_payment' then 'cancelled'::public.play_session_status
    else 'expired'::public.play_session_status
  end
  where (status = 'active' and valid_until is not null and valid_until <= now())
     or (status = 'pending_payment' and expires_at is not null and expires_at <= now());

  with dead as (
    select pc.player_id, pc.minutes_remaining
    from public.player_credits pc
    where pc.minutes_remaining > 0
      and not exists (
        select 1
        from public.play_sessions ps
        where ps.player_id = pc.player_id
          and ps.status = 'active'
          and (ps.valid_until is null or ps.valid_until > now())
      )
  )
  insert into public.play_credit_ledger (player_id, minutes_delta, reason)
  select dead.player_id, -dead.minutes_remaining, 'expiry_writeoff'::public.credit_reason
  from dead;

  get diagnostics v_swept = row_count;

  update public.play_sessions
  set status = 'consumed'
  where status = 'expired'
    and exists (
      select 1 from public.player_credits pc
      where pc.player_id = play_sessions.player_id and pc.minutes_remaining = 0
    );

  return v_swept;
end;
$$;

-- Revoking from `public` also strips service_role's implicit grant, so the
-- secret-key client (the only intended caller) is granted back explicitly.
revoke execute on function public.expire_play_credits() from public, anon, authenticated;
grant execute on function public.expire_play_credits() to service_role;

-- ---------------------------------------------------------------------------
-- Auto-provision a player + credits row for every registered account
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id uuid;
begin
  select p.id into v_player_id from public.players p where p.profile_id = new.id;

  if v_player_id is null then
    insert into public.players (profile_id, display_name)
    values (
      new.id,
      coalesce(nullif(new.full_name, ''), split_part(coalesce(new.email, ''), '@', 1), 'Player')
    )
    returning id into v_player_id;
  end if;

  -- players_ensure_credits opens the balance row for us.
  return new;
end;
$$;

revoke execute on function public.handle_new_profile() from public, anon, authenticated;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- Backfill: existing accounts (incl. the seeded dev admin) get a player row,
-- and every player — walk-ins included — gets a zeroed credits row.
insert into public.players (profile_id, display_name)
select pr.id, coalesce(nullif(pr.full_name, ''), split_part(coalesce(pr.email, ''), '@', 1), 'Player')
from public.profiles pr
where not exists (select 1 from public.players p where p.profile_id = pr.id);

insert into public.player_credits (player_id)
select p.id from public.players p
on conflict (player_id) do nothing;

-- ---------------------------------------------------------------------------
-- Payments now settle either a booking OR a play session (never both)
-- ---------------------------------------------------------------------------
alter table public.payments alter column booking_id drop not null;
alter table public.payments
  add column play_session_id uuid references public.play_sessions (id) on delete cascade;
alter table public.payments
  add constraint payments_single_target check (num_nonnulls(booking_id, play_session_id) = 1);

create index payments_by_play_session on public.payments (play_session_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger play_sessions_updated_at before update on public.play_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (S1, S11) — money tables are read-your-own, write-nobody.
-- Every mutation runs server-side through the API with the secret-key client
-- after the controller has validated the rules.
-- ---------------------------------------------------------------------------
alter table public.play_sessions enable row level security;
alter table public.player_credits enable row level security;
alter table public.play_credit_ledger enable row level security;

create policy "players read own play sessions" on public.play_sessions
  for select to authenticated using (player_id = public.current_player_id());
create policy "admin all play sessions" on public.play_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "players read own credits" on public.player_credits
  for select to authenticated using (player_id = public.current_player_id());
create policy "admin all credits" on public.player_credits
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "players read own ledger" on public.play_credit_ledger
  for select to authenticated using (player_id = public.current_player_id());
create policy "admin all ledger" on public.play_credit_ledger
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Registered players may rename themselves; everything else on players stays staff-only.
create policy "players update own row" on public.players
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants (the CLI does not auto-grant SQL-created tables)
-- ---------------------------------------------------------------------------
-- S11: no anon grants at all on the money tables — balances are not public.
grant select on
  public.play_sessions,
  public.player_credits,
  public.play_credit_ledger
to authenticated;

grant all on
  public.play_sessions,
  public.player_credits,
  public.play_credit_ledger
to service_role;

-- Column-level: a player can rename themselves, not reassign their account.
grant update (display_name, skill_level) on public.players to authenticated;
