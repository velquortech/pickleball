-- LOCAL DEVELOPMENT ONLY: player accounts for QA of the self-serve open-play flow.
-- Password for every account below: Player123!
--
--   rico@pickleball.local   Rico Reyes    120 min (2h paid)   follows Maya, Dan, Bea
--   maya@pickleball.local   Maya Santos    60 min (1h paid)   follows Rico
--   dan@pickleball.local    Dan Cruz       60 min (1h paid)   follows Rico
--   bea@pickleball.local    Bea Lim        60 min (1h paid)
--   tito@pickleball.local   Tito Nava       0 min             — paywall / 402 checks
--   lily@pickleball.local   Lily Tan        0 min, unpaid pass waiting — /play/pass checks
--
-- These are players, not staff: no role in raw_app_meta_data, so they cannot
-- reach /admin. The trigger chain (auth.users → profiles → players →
-- player_credits) provisions each player row and a zeroed balance automatically.
--
-- Idempotent: safe to re-run. Credits are granted through the ledger and backed
-- by an active pass, exactly as a real purchase is — a bare ledger credit would
-- be written off by expire_play_credits() on the next sweep.

-- ---------------------------------------------------------------------------
-- Auth users + identities
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000',
  seed.id::uuid,
  'authenticated',
  'authenticated',
  seed.email,
  crypt('Player123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('full_name', seed.full_name),
  now(),
  now(),
  '', '', '', ''
from (values
  ('b0000000-0000-4000-8000-000000000001', 'rico@pickleball.local', 'Rico Reyes'),
  ('b0000000-0000-4000-8000-000000000002', 'maya@pickleball.local', 'Maya Santos'),
  ('b0000000-0000-4000-8000-000000000003', 'dan@pickleball.local',  'Dan Cruz'),
  ('b0000000-0000-4000-8000-000000000004', 'bea@pickleball.local',  'Bea Lim'),
  ('b0000000-0000-4000-8000-000000000005', 'tito@pickleball.local', 'Tito Nava'),
  ('b0000000-0000-4000-8000-000000000006', 'lily@pickleball.local', 'Lily Tan')
) as seed(id, email, full_name)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email in (
  'rico@pickleball.local', 'maya@pickleball.local', 'dan@pickleball.local',
  'bea@pickleball.local', 'tito@pickleball.local', 'lily@pickleball.local'
)
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------------
-- Paid passes (active) — minutes expire at closing time, like a real purchase
-- ---------------------------------------------------------------------------
with facility as (
  select close_hour, timezone, booking_hold_minutes from public.facility_settings limit 1
),
open_play_rate as (
  select price_cents, currency
  from public.rates
  where rate_type = 'open_play' and is_active
  order by sort_order
  limit 1
),
closing as (
  -- Today's closing instant in the facility timezone, rolled to tomorrow if past.
  select case when c <= now() then c + interval '1 day' else c end as valid_until
  from (
    select (
      date_trunc('day', (now() at time zone f.timezone)) + make_interval(hours => f.close_hour)
    ) at time zone f.timezone as c
    from facility f
  ) t
),
seed(email, reference_code, hours) as (values
  ('rico@pickleball.local', 'OP-DEVRCA22', 2),
  ('maya@pickleball.local', 'OP-DEVMYA33', 1),
  ('dan@pickleball.local',  'OP-DEVDAN44', 1),
  ('bea@pickleball.local',  'OP-DEVBEA55', 1)
)
insert into public.play_sessions (
  player_id, reference_code, status, hours_purchased, minutes_total,
  amount_cents, currency, activated_at, valid_until
)
select
  p.id,
  seed.reference_code,
  'active'::public.play_session_status,
  seed.hours,
  seed.hours * 60,
  r.price_cents * seed.hours,
  r.currency,
  now(),
  cl.valid_until
from seed
join public.profiles pr on pr.email = seed.email
join public.players p on p.profile_id = pr.id
cross join open_play_rate r
cross join closing cl
on conflict (reference_code) do nothing;

-- ---------------------------------------------------------------------------
-- One unpaid pass, so /play/pass/[reference] has something to pay for
-- ---------------------------------------------------------------------------
with facility as (
  select booking_hold_minutes from public.facility_settings limit 1
),
open_play_rate as (
  select price_cents, currency
  from public.rates
  where rate_type = 'open_play' and is_active
  order by sort_order
  limit 1
)
insert into public.play_sessions (
  player_id, reference_code, status, hours_purchased, minutes_total,
  amount_cents, currency, expires_at
)
select
  p.id,
  'OP-DEVTAN66',
  'pending_payment'::public.play_session_status,
  1,
  60,
  r.price_cents,
  r.currency,
  now() + make_interval(mins => f.booking_hold_minutes)
from public.profiles pr
join public.players p on p.profile_id = pr.id
cross join open_play_rate r
cross join facility f
where pr.email = 'lily@pickleball.local'
on conflict (reference_code) do nothing;

-- ---------------------------------------------------------------------------
-- Payment rows: the paid passes settled, the pending one still waiting
-- ---------------------------------------------------------------------------
insert into public.payments (play_session_id, provider, amount_cents, currency, status, paid_at)
select ps.id, 'mock', ps.amount_cents, ps.currency, 'paid'::public.payment_status, now()
from public.play_sessions ps
where ps.reference_code in ('OP-DEVRCA22', 'OP-DEVMYA33', 'OP-DEVDAN44', 'OP-DEVBEA55')
  and not exists (select 1 from public.payments pm where pm.play_session_id = ps.id);

insert into public.payments (play_session_id, provider, amount_cents, currency, status)
select ps.id, 'mock', ps.amount_cents, ps.currency, 'pending'::public.payment_status
from public.play_sessions ps
where ps.reference_code = 'OP-DEVTAN66'
  and not exists (select 1 from public.payments pm where pm.play_session_id = ps.id);

-- ---------------------------------------------------------------------------
-- Credit the paid passes through the ledger (the only writer of the balance)
-- ---------------------------------------------------------------------------
insert into public.play_credit_ledger (player_id, play_session_id, minutes_delta, reason)
select ps.player_id, ps.id, ps.minutes_total, 'purchase'::public.credit_reason
from public.play_sessions ps
where ps.reference_code in ('OP-DEVRCA22', 'OP-DEVMYA33', 'OP-DEVDAN44', 'OP-DEVBEA55')
  and not exists (
    select 1 from public.play_credit_ledger l
    where l.play_session_id = ps.id and l.reason = 'purchase'
  );

-- ---------------------------------------------------------------------------
-- Follow graph — you may only invite someone you already follow (P11)
-- ---------------------------------------------------------------------------
insert into public.follows (follower_id, followee_id)
select follower.id, followee.id
from (values
  ('rico@pickleball.local', 'maya@pickleball.local'),
  ('rico@pickleball.local', 'dan@pickleball.local'),
  ('rico@pickleball.local', 'bea@pickleball.local'),
  ('maya@pickleball.local', 'rico@pickleball.local'),
  ('dan@pickleball.local',  'rico@pickleball.local')
) as edge(follower_email, followee_email)
join public.profiles fpr on fpr.email = edge.follower_email
join public.players follower on follower.profile_id = fpr.id
join public.profiles tpr on tpr.email = edge.followee_email
join public.players followee on followee.profile_id = tpr.id
on conflict (follower_id, followee_id) do nothing;
