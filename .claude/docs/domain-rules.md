# Domain Rules (pickleball facility)

## Courts, matchmaking, bookings

- Matchmaking allocates **exactly 4 or exactly 2** players per court (never 3),
  FIFO from the queue, open-play courts only. Matches run
  `facility_settings.match_duration_minutes` (default 20); ending a match can
  re-queue players at the back and auto-fill free courts.
- A match is a **court roster** with a lifecycle: `forming` (seats open, court
  held) → `active` (clock running, everyone charged) → `completed`/`cancelled`.
  A forming roster holds its court exactly as firmly as an active match, and a
  roster that never fills expires (`forming_expires_at`) and releases the court.
- `matches.capacity` is 2 or 4. `ends_at` is null while forming and required once
  active. Never build a 3-player match — admin force-start resizes the roster to
  the players actually on court.
- Bookings (private rental / coaching) are **VIP courts only**, hourly slots within
  open hours, price always computed server-side from `rates`. Pending bookings hold
  the slot until `expires_at`; overlap is blocked by a DB exclusion constraint.
- Bookings confirm ONLY via the signature-verified payment webhook (or the mock
  provider outside production). Reference codes: `PB-XXXXXXXX`, crypto-random.

## Self-serve open play (pay first)

- Players register at `/auth/register` and play from `/play`. The trigger chain
  `auth.users → profiles → players → player_credits` provisions a player row and
  a zeroed balance for every account, so a new account can be charged immediately.
- **Pay before you play.** A player buys 1–8 whole hours (`play_sessions`,
  reference `OP-XXXXXXXX`). Settling the payment credits `hours × 60` minutes to
  the append-only `play_credit_ledger`, which is the only writer of
  `player_credits.minutes_remaining`. That column's `>= 0` check constraint IS
  the paywall — queueing, stacking, claiming a court, and inviting all require a
  balance of at least `match_duration_minutes`. Respond **402** when it is short.
- Players are debited when a match **starts**, not when they join, and exactly
  once per match. Minutes expire at `facility_settings.close_hour`.
- **Every player pays for themselves.** An invite to a friend with no playing
  time is refused (402) rather than sent.
- **Stacking**: a player claims a free open-play court (opening a `forming`
  roster) or stacks onto one that is short a player. Filling the roster starts
  the match and charges everyone.
- **Queueing**: `POST /api/queue/me` takes a spot and immediately runs allocation,
  so a player is seated without staff. `_lib/queue-projection.ts` replays the
  matchmaker forward to show which court each waiting player lands on and when —
  the queue always drains into whichever court frees up first.
- **Invites** require following: you may only invite a player you already follow,
  onto a forming court you are standing on that still has a seat.
- **Every ledger credit must be backed by an active pass.** `expire_play_credits()`
  writes off any balance no unexpired active pass accounts for, so a bare ledger
  insert silently evaporates on the next sweep. Walk-ins added by staff face the
  same paywall: `addWalkIn({ hours })` calls `createCounterPass()`, which creates
  an already-paid `active` pass (provider `counter`) plus its ledger credit.
  Unfunded players are dropped from the queue rather than left blocking the FIFO head.
- Credits and rosters are **system operations**: they write other players'
  ledgers, so they use the secret-key client. Authorization happens at the
  exported entry point (`requireAdmin()` / `requirePlayer()`), never inside.

## Auth

- Admin role lives in `app_metadata.role` (never `user_metadata`). Local dev admin:
  `admin@pickleball.local` / `Admin123!` (seeded, local only).
- `requirePlayer()` derives the acting player from the session (cookie or bearer).
  No endpoint ever accepts a client-supplied id for *who is acting*.
- Facility settings (hours, match duration, booking hold) are edited at
  `/admin/settings` through `app/api/settings`.

Full rationale, loophole/security register (L1–L23, S1–S15), and the open backlog
live in `.claude/open-play-parities-and-action-items.md`.
