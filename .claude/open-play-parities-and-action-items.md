# Self-Serve Open Play — Parities & Action Items

Players register, buy playing time, then queue, claim courts, stack onto courts
that are a player short, and pull in the friends they follow. **Nobody plays
without paying first**, and **every player pays for themselves**.

This document is the contract between the product ask and the code. Each parity
(`P#`) states a requirement and where it is enforced. Each loophole (`L#`) and
security item (`S#`) names an attack or a race, and the mechanism that closes
it. Numbering continues the original build: `L1–L13` / `S1–S10` cover bookings,
matchmaking, and the admin surface; this feature adds `L14–L23` / `S11–S15`.

Status legend: **✅ shipped** · **🟡 partial** · **⬜ not started**

---

## 1. Domain model

A **play session** (a "pass") is a purchase of whole hours. Paying for it credits
`hours × 60` minutes into an append-only **credit ledger**, which is the only
writer of `player_credits.minutes_remaining`. That column carries a
`check (minutes_remaining >= 0)` constraint, and **that constraint is the
paywall**: nothing that costs court time can happen unless a debit succeeds.

A **match** is a court roster with a lifecycle:

```
forming ──(roster fills)──▶ active ──▶ completed
   │                          │
   └──(hold expires,          └──(staff cancel ⇒ refund)
       last player leaves,
       staff cancel)──▶ cancelled
```

* `forming` holds the court exactly as firmly as `active` — a half-full court is
  never handed to the matchmaker.
* Capacity is **2 (singles) or 4 (doubles)**. Never 3.
* Players are charged when the match **starts**, not when they join. A roster
  that never fills costs nobody anything.

Money and rosters meet in exactly one place: `startRoster()` flips the match to
`active` and debits every player in the same call, rolling the court back if any
debit fails.

---

## 2. Parities

Requirement → where it lives.

| # | Requirement | Enforced by | Status |
|---|---|---|---|
| **P1** | Public live court board — a forming roster shows as **filling** (`3/4`) with a join CTA, never as free | `app/live/components/court-grid.tsx` | ✅ |
| **P2** | VIP courts are booked, not stacked | `bookings/controller.ts` (L11) | ✅ (pre-existing) |
| **P3** | Matchmaking allocates 4 or 2, never 3, FIFO | `_lib/matchmaking.ts` | ✅ (pre-existing) |
| **P4** | Ending a match frees the court and refills it | `matches/controller.ts#endMatch` | ✅ (pre-existing) |
| **P5** | Match runs `facility_settings.match_duration_minutes` | `_lib/settings.ts` | ✅ (pre-existing) |
| **P6** | **Users register and check available courts** | `/auth/register`, `GET /api/matches/open` | ✅ |
| **P7** | **Users place or stack themselves onto courts short a member** | `POST /api/matches/open`, `POST /api/matches/[id]/join`, `_lib/stacking.ts` | ✅ |
| **P8** | **Users queue themselves and are auto-assigned to the court about to end** | `POST /api/queue/me` → `systemAllocate()`, `_lib/queue-projection.ts` | ✅ |
| **P9** | **Pay first — for as many hours as you like — before queueing or inviting** | `_lib/credits.ts#assertCanAfford`, `player_credits` check constraint (L15) | ✅ |
| **P10** | **Users invite friends they follow; friends join if a court has room** | `POST /api/invites`, `PATCH /api/invites/[id]`, `_lib/invites.ts` | ✅ |
| **P11** | **You may only invite someone you already follow** | `canInvite()` → `not_following` | ✅ |
| **P12** | **Each player pays for themselves** — no host-covers-guest | `canInvite()` → `invitee_has_no_credits` (402 before the invite is even sent) | ✅ |
| **P13** | **Responsive on mobile and web** | Mobile-first Tailwind: single column → `sm:grid-cols-2` → `lg:grid-cols-[2fr_1fr]`; queue/invites float above the court board on small screens | ✅ |
| **P14** | Walk-ins face the same paywall | `addWalkIn({ hours })` → `createCounterPass()`: an already-paid `active` pass (provider `counter`) plus its ledger credit | ✅ |

### Payment model (decided)

Prepaid **time credits**, not per-match or day-pass billing:

* Buy 1–8 whole hours; price is `rates.open_play.price_cents × hours`, always
  computed server-side (**L2** — the client never sends an amount).
* Each match costs `match_duration_minutes` (default 20).
* Minutes expire when the facility closes (`facility_settings.close_hour`).
* Passes settle **only** through the signature-verified payment webhook, or the
  mock provider outside production (**L3**).

---

## 3. Loopholes closed

Each of these is a race or an exploit that a read-then-write in application code
would lose. Every one is enforced in Postgres, and covered by an integration
test that asserts the exact SQLSTATE.

| # | Loophole | Mechanism | Test |
|---|---|---|---|
| **L14** | Player spams checkouts, hoarding pending passes | Partial unique index `one_pending_play_session_per_player` | `play-credits.test.ts` |
| **L15** | **Player plays without paying / overdraws their balance** | `check (minutes_remaining >= 0)` + row-locking `UPDATE` in `apply_credit_ledger()` | `play-credits.test.ts` |
| **L16** | Retried match start charges a player twice | Partial unique index `one_debit_per_player_per_match` | `play-credits.test.ts` |
| **L17** | Unpaid-for minutes outlive their pass | `expire_play_credits()` swept lazily before any balance read or spend | `play-credits.test.ts` |
| **L18** | A half-full roster squats a court forever | `forming_expires_at` + `expireFormingRosters()` | — (time-based; see backlog) |
| **L19** | A 5th player joins a doubles court, or a 3rd joins singles | `guard_match_player_insert()` locks the match row (`for update`) and raises `PB001` | `stacking-constraints.test.ts` |
| **L20** | One player occupies two live courts, committing their minutes twice | Same trigger, raises `PB002` | `stacking-constraints.test.ts` |
| **L21** | Invite spam to the same player for the same court | Partial unique index `one_pending_invite_per_match_invitee` | `follows-invites.test.ts` |
| **L22** | A player whose minutes ran out blocks the head of the FIFO queue | `runAllocation()` drops unfunded waiting entries; `startRosterIfFull()` drops unfunded stackers | `play-credits.test.ts` (ledger side) |
| **L23** | A player leaves a court but their invites to it stay live | `leaveRoster()` expires the leaver's pending invites | `follows-invites.test.ts` (cascade) |

Two more, inherited and re-verified because the schema changed underneath them:

* **L6** — one live match per court, now `where status in ('forming','active')`.
* **L7** — never a 3-player match: `capacity in (2,4)`, and admin force-start
  resizes the roster to the players actually on court.

### Invariant: every credit is backed by an active pass

`expire_play_credits()` writes off any balance that no unexpired `active` pass
accounts for. That makes a bare `play_credit_ledger` insert a **silent bug**: the
minutes appear, then evaporate on the next sweep, and L22 drops the player from
the queue. This actually shipped in the first cut of `addWalkIn()` and was caught
by a cross-file test flake — the global sweep in one test file kept zeroing a
balance another file had credited without a pass.

Anything that grants minutes must create the pass that backs them.
`createCounterPass()` is that path for cash sales; `settle_play_session()` is the
path for online purchases. Regression test:
`play-credits.test.ts › does not sweep away minutes credited by a counter sale`.

### A Postgres subtlety worth remembering

`apply_credit_ledger()` deliberately does **not** use
`insert … on conflict do update`. Postgres evaluates `CHECK` constraints against
the *proposed* insert tuple **before** it resolves the conflict, so a negative
delta fails the `>= 0` check even when the balance row already exists and the
arithmetic would land on zero. The trigger does a plain `UPDATE` instead (with an
`INSERT` fallback), which is checked against the *final* row. A `players` trigger
guarantees the balance row always exists.

---

## 4. Security

| # | Item | Mechanism |
|---|---|---|
| **S11** | Balances, ledgers, and passes are not public | No `anon` grants at all; `authenticated` gets `SELECT` only, filtered by RLS to `player_id = current_player_id()` |
| **S12** | A player's follow graph and invites are theirs alone | RLS: `follows` readable by either endpoint, insertable only as yourself (`WITH CHECK follower_id = current_player_id()`); `match_invites` readable by inviter/invitee, writable only through the API |
| **S13** | A player cannot act as another player | `requirePlayer()` derives the player id from the session (cookie **or** bearer); no endpoint accepts a caller-supplied `playerId` for *who is acting* |
| **S14** | Reference codes and invite ids are not enumerable levers | `getMySessionByReference()` scopes by `player_id`; only the invitee may answer an invite, only the inviter may withdraw it |
| **S15** | `?next=` cannot bounce a signed-in player off-site | `safeNextPath()` rejects absolute and protocol-relative URLs |

Unchanged and still load-bearing: admin role lives in `app_metadata` (**never**
`user_metadata`); `requireAdmin()` is the hard boundary and `proxy.ts` is only an
optimistic redirect; the secret-key client is server-only.

**Why credit writes bypass RLS.** Allocation and match start charge *other*
players' ledgers — a user-scoped client cannot and must not do that. Those paths
run with the secret-key client and are *system* operations; authorization happens
at the exported entry point (`allocateMatches()` calls `requireAdmin()`,
`joinQueue()` calls `requirePlayer()`), never inside `runAllocation()` itself.
The ledger is append-only and the `>= 0` constraint still holds, so a bug there
can drop minutes but can never mint them.

---

## 5. Schema added

```
play_sessions        purchase of N hours; pending_payment → active → consumed/expired
play_credit_ledger   append-only minutes movements (purchase / match_debit /
                     match_refund / expiry_writeoff / admin_adjustment)
player_credits       materialized balance; check (minutes_remaining >= 0)
follows              (follower_id, followee_id) — one-directional, no self-edges
match_invites        pending → accepted / declined / cancelled / expired
```

Altered: `matches` gains `capacity`, `open_to_stacking`, `forming_expires_at`, and a
nullable `ends_at` (`check (status <> 'active' or ends_at is not null)`);
`match_players` gains `source` and `joined_at`; `payments.booking_id` becomes
nullable alongside a new `play_session_id`, with
`check (num_nonnulls(booking_id, play_session_id) = 1)`.

Functions: `current_player_id()`, `ensure_player_credits()`, `apply_credit_ledger()`,
`expire_play_credits()`, `handle_new_profile()`, `guard_match_player_insert()`,
`settle_play_session()`.

Trigger chain on registration:
`auth.users → profiles → players → player_credits`, so a new account can be
charged the moment it exists.

Migrations (four, because `ALTER TYPE … ADD VALUE` cannot be *used* in the
transaction that adds it):

1. `20260710010000_open_play_enums.sql`
2. `20260710010100_player_accounts_and_credits.sql`
3. `20260710010200_stacking_follows_invites.sql`
4. `20260710010300_settle_play_session.sql`

---

## 6. API surface

Public (`api`):

```
GET    /api/matches/open          courts + live rosters + open seats
GET    /api/queue/projection      who lands on which court, and when
POST   /api/payments/mock         sandbox settle (PB- booking or OP- pass)
```

Player (`playerApi` — bearer token, redirects to `/auth/login` on 401):

```
GET    /api/players/me            identity, balance, commitments, invite count
PATCH  /api/players/me            rename / skill level
GET    /api/players?search=       find friends to follow
GET    POST   /api/sessions       list passes / buy hours
GET    /api/sessions/[reference]  one pass (ownership-scoped)
POST   /api/sessions/[ref]/cancel drop an unpaid pass
POST   DELETE /api/queue/me       join / leave the queue
POST   /api/matches/open          claim a free court, open a roster
POST   DELETE /api/matches/[id]/join   stack in / leave a forming roster
GET    POST   /api/follows        follow graph
DELETE /api/follows/[playerId]    unfollow
GET    POST   /api/invites        inbox+outbox / send
PATCH  DELETE /api/invites/[id]   accept|decline / withdraw
```

Staff (`authApi`, all behind `requireAdmin()`): `POST /api/matches/[id]/start`
(start a half-full roster as singles) and `POST /api/matches/[id]/cancel`
(abandon a live match, refunding an `active` one).

HTTP status contract: **402** means "buy playing time" and is the only status the
UI turns into a purchase CTA. **409** means "somebody or something got there
first" — full court, taken court, duplicate invite, already committed.

---

## 7. Test map

**Unit — pure engines** (`__tests__/unit/`)

* `play-credits.test.ts` — hours→minutes, server-side pricing, affordability
  boundary (19 vs 20 min), closing-time expiry incl. the after-hours and
  midnight-close rollovers.
* `stacking.test.ts` — open seats, never-3, expired rosters, and every
  `canStack` rejection.
* `queue-projection.test.ts` — **the headline**: the queue drains into the court
  that frees up first; a second group spills onto the next; a lone 5th player is
  left unprojected rather than forming a 3-player match.
* `invites.test.ts` — follow-gating, pay-for-yourself, TTL never outliving the
  roster hold.
* `play-search-params.test.ts` — `?hours=` round-trip; `?next=` open-redirect
  rejection (S15).

**Unit — components (RTL)**

* `register-form.test.tsx` — redirect on session, confirmation path, short-password guard.
* `open-courts-board.test.tsx` — "waiting for 1 more player", stack/claim/leave,
  paywall disables the button, in-play courts offer no seat.

**Integration — local Supabase** (`__tests__/integration/`)

* `play-credits.test.ts` — overdraft rejected (`23514`), one debit per match
  (`23505`), one pending pass, expiry write-off, `settle_play_session`
  idempotency.
* `stacking-constraints.test.ts` — `PB001` full roster, `PB002` double-booked
  player, `PB003` dead roster, forming holds the court, `active` requires an end
  time, `capacity = 3` rejected.
* `follows-invites.test.ts` — no self-follow, no self-invite, one pending invite
  per (match, invitee), cascade on roster delete.
* `player-rls.test.ts` — the trigger chain provisions player + balance; anon sees
  nothing; **one player cannot read another's balance or ledger**; a player
  cannot credit themselves, top up their own balance, activate an unpaid pass,
  follow as somebody else, or rename another player.

Verified end-to-end against a running dev server: paywall → buy → pay → claim →
stack → invite → accept → auto-start with four debits → queue auto-assignment →
projection onto the soonest-free court → staff cancel with refund.

---

## 8. Action items

### Phase 1 — Schema & money ✅
1. ✅ Enums, `play_sessions`, `play_credit_ledger`, `player_credits`, RLS, grants.
2. ✅ Generalize `payments` to settle a booking **or** a pass.
3. ✅ `settle_play_session()` — atomic claim + credit + mark paid, idempotent.
4. ✅ Auto-provision player + balance for every registered account.

### Phase 2 — Stacking, follows, invites ✅
5. ✅ `matches.capacity` / `forming` status / `forming_expires_at`.
6. ✅ `guard_match_player_insert()` — capacity and one-live-court guards.
7. ✅ `follows` + `match_invites` with RLS scoped to the endpoints.

### Phase 3 — Engines & API ✅
8. ✅ Pure engines: `play-credits`, `stacking`, `queue-projection`, `invites`.
9. ✅ `requirePlayer()`; controllers for players, sessions, follows, invites.
10. ✅ Queue self-service + `systemAllocate()` so a player is seated without staff.
11. ✅ `playerApi` transport in `services/http.ts`.

### Phase 4 — Player UI ✅
12. ✅ `/auth/register`, `/auth/login`, `proxy.ts` gate for `/play`.
13. ✅ `/play` hub: credits, open courts, queue + ETA, invites, friends.
14. ✅ `/play/buy` (URL-state hours) and `/play/pass/[reference]` (pay / cancel).
15. ✅ Realtime refresher on courts, queue, invites, and balance.

### Phase 5 — Tests ✅
16. ✅ Unit suites for all four engines + URL helpers.
17. ✅ RTL suites for registration and the stacking board.
18. ✅ Integration suites for credits, stacking, invites, and player RLS.

### Backlog — not shipped

19. ⬜ **Replace the lazy sweeps with a cron.** `expire_play_credits()` and
    `expireFormingRosters()` run on read. A `pg_cron` job (or a Vercel Cron
    hitting an authenticated route) would bound their latency and let us test
    L18 deterministically instead of relying on wall-clock time.
20. ⬜ **Real payment provider.** Swap the mock for a live provider; the webhook
    signature check (S6) and `settle_play_session()` already handle it. Also
    reconcile: a nightly job comparing `payments.status` against the provider.
21. ⬜ **Push notifications for invites.** The inbox updates over Realtime while
    the tab is open; an invite that arrives on a locked phone is missed. Web Push
    (or SMS) would make the 10-minute invite TTL usable.
23. ⬜ **Admin visibility into credits.** Staff can add a walk-in with hours but
    cannot see or adjust a player's balance from `/admin`. Add a players panel
    backed by `listAllSessions()` (already written, not yet routed) plus an
    `admin_adjustment` form.
24. ⬜ **Refund policy on leaving mid-match.** A player who abandons an `active`
    match today loses their 20 minutes and the court stays occupied. Decide the
    policy (forfeit? partial refund? re-queue the remaining three?) before this
    hits a real facility.
25. ⬜ **Rate-limit follow/search.** `GET /api/players?search=` is authenticated
    and wildcard-escaped, but nothing throttles roster enumeration.
26. ⬜ **E2E in CI.** The end-to-end drive lives in a scratchpad script. Port it
    to Playwright so the buy→stack→invite→start path guards against regressions.
