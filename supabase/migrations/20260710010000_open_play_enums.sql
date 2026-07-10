-- Self-serve open play: new enum types.
--
-- Postgres allows `alter type ... add value` inside a transaction block, but the
-- new label cannot be USED until that transaction commits. The Supabase CLI runs
-- each migration file in its own transaction, so 'forming' is added here and
-- first used by the migration that follows.

-- A match now starts life as 'forming': a court is claimed and its roster is
-- open for stacking. It flips to 'active' the moment the roster fills.
alter type public.match_status add value if not exists 'forming' before 'active';

-- A prepaid block of playing time bought by a player.
create type public.play_session_status as enum (
  'pending_payment', -- checkout created, not paid yet (holds nothing but itself)
  'active',          -- paid; its minutes are spendable until valid_until
  'expired',         -- valid_until passed with minutes left over
  'consumed',        -- minutes fully spent
  'cancelled'        -- abandoned before payment
);

create type public.invite_status as enum (
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'expired'
);

-- How a player landed on a court roster (analytics + audit).
create type public.match_player_source as enum ('queue', 'stack', 'invite', 'walk_in');

-- Every movement of playing-time minutes is an append-only ledger row.
create type public.credit_reason as enum (
  'purchase',          -- a paid play session credited its minutes
  'match_debit',       -- a match started and charged the player
  'match_refund',      -- a started match was cancelled; minutes returned
  'expiry_writeoff',   -- unspent minutes died with the session
  'admin_adjustment'   -- staff correction
);
