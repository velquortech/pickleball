-- Initial schema: courts, players, queue, matches, bookings, payments, rates, settings.
-- Design notes live in .claude/parities-and-action-items.md (loopholes L1–L12, security S1–S10).

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.court_type as enum ('open_play', 'vip');
create type public.court_status as enum ('open', 'maintenance', 'closed');
create type public.queue_status as enum ('waiting', 'called', 'playing', 'done', 'cancelled');
create type public.match_status as enum ('active', 'completed', 'cancelled');
create type public.booking_type as enum ('private_rental', 'coaching');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'completed', 'expired');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.rate_type as enum ('open_play', 'private_rental', 'coaching');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Admin check reads app_metadata (never user_metadata — that is user-editable).
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  court_type public.court_type not null default 'open_play',
  status public.court_status not null default 'open',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references auth.users (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 60),
  skill_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  status public.queue_status not null default 'waiting',
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- L5: a player can only be in the active queue once.
create unique index one_active_queue_entry_per_player
  on public.queue_entries (player_id)
  where status in ('waiting', 'called', 'playing');

create index queue_entries_waiting_fifo
  on public.queue_entries (joined_at)
  where status = 'waiting';

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete restrict,
  status public.match_status not null default 'active',
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- L6: a court can only host one active match at a time (atomic claim).
create unique index one_active_match_per_court
  on public.matches (court_id)
  where status = 'active';

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  queue_entry_id uuid references public.queue_entries (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  booking_type public.booking_type not null,
  court_id uuid not null references public.courts (id) on delete restrict,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text not null,
  customer_phone text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  players_count integer not null default 4 check (players_count between 1 and 4),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'PHP',
  status public.booking_status not null default 'pending_payment',
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- L1: race-proof double-booking prevention at the database level.
-- Pending bookings hold the slot until they expire (L4 — lazily flipped to 'expired').
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    court_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status in ('pending_payment', 'confirmed'));

create index bookings_by_day on public.bookings (court_id, starts_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  provider text not null default 'mock',
  provider_ref text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'PHP',
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_by_booking on public.payments (booking_id);

create table public.rates (
  id uuid primary key default gen_random_uuid(),
  rate_type public.rate_type not null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'PHP',
  unit text not null, -- e.g. 'per head', 'per hour'
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Singleton settings row (id is always true).
create table public.facility_settings (
  id boolean primary key default true check (id),
  match_duration_minutes integer not null default 20 check (match_duration_minutes between 5 and 120),
  max_players_per_match integer not null default 4 check (max_players_per_match in (2, 4)),
  min_players_per_match integer not null default 2 check (min_players_per_match = 2),
  open_hour integer not null default 8 check (open_hour between 0 and 23),
  close_hour integer not null default 22 check (close_hour between 1 and 24),
  timezone text not null default 'Asia/Manila',
  booking_hold_minutes integer not null default 15 check (booking_hold_minutes between 5 and 120),
  updated_at timestamptz not null default now(),
  check (close_hour > open_hour)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger courts_updated_at before update on public.courts
  for each row execute function public.set_updated_at();
create trigger players_updated_at before update on public.players
  for each row execute function public.set_updated_at();
create trigger queue_entries_updated_at before update on public.queue_entries
  for each row execute function public.set_updated_at();
create trigger matches_updated_at before update on public.matches
  for each row execute function public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger rates_updated_at before update on public.rates
  for each row execute function public.set_updated_at();
create trigger facility_settings_updated_at before update on public.facility_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (S1)
-- ---------------------------------------------------------------------------
alter table public.courts enable row level security;
alter table public.players enable row level security;
alter table public.queue_entries enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.rates enable row level security;
alter table public.facility_settings enable row level security;

-- Dashboard-safe tables: public read (the /live page and landing need these).
create policy "public read courts" on public.courts
  for select to anon, authenticated using (true);
create policy "public read players" on public.players
  for select to anon, authenticated using (true);
create policy "public read queue" on public.queue_entries
  for select to anon, authenticated using (true);
create policy "public read matches" on public.matches
  for select to anon, authenticated using (true);
create policy "public read match players" on public.match_players
  for select to anon, authenticated using (true);
create policy "public read rates" on public.rates
  for select to anon, authenticated using (true);
create policy "public read settings" on public.facility_settings
  for select to anon, authenticated using (true);

-- Admin full access (S2/S7 — both USING and WITH CHECK).
create policy "admin all courts" on public.courts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all players" on public.players
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all queue" on public.queue_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all matches" on public.matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all match players" on public.match_players
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all rates" on public.rates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all settings" on public.facility_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Bookings/payments: NO anon read (S8). Admin only; public flows go through the
-- REST API which uses the server-only secret-key client after validation (S4).
create policy "admin all bookings" on public.bookings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all payments" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime (S10): only dashboard-safe tables are published.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.courts,
  public.players,
  public.queue_entries,
  public.matches,
  public.match_players;
