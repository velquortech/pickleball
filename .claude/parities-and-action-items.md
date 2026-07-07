# PicklePoint-Style Facility — Feature Parities & Action Items

Living planning doc. Update statuses as features land. Created 2026-07-07.

## Feature parity checklist (vs. PicklePoint Iloilo)

| # | Parity item | Ours | Status |
|---|---|---|---|
| P1 | 6+ courts, mix of open-play and VIP/private | `courts` table with `court_type` enum (`open_play`, `vip`), seeded with 6 courts, admin can add more dynamically | done |
| P2 | Walk-ins added to a live queue display | `players` + `queue_entries` tables; admin adds walk-ins; public `/live` page shows queue in real time | done |
| P3 | When a court opens, 4 players are called to play | Matchmaking allocator: prefers 4 players, falls back to 2, never 3; assigns earliest-queued first (FIFO) | done |
| P4 | 20-minute matches, then players rotate out | `matches.ends_at = started_at + settings.match_duration_minutes`; end-match endpoint frees court and can auto-fill from queue | done |
| P5 | Players can rejoin the queue after playing | End-match supports `rejoinQueue` — re-adds finished players at the back | done |
| P6 | Private courts up to 4 players, hourly rates | `bookings` with `players_count <= 4` default cap, hourly slots, rate computed server-side | done |
| P7 | Public visibility of "is it packed?" | `/live` shows courts in use vs. free, active matches with countdown, queue length; realtime via Supabase | done |
| P8 | Landing page with rates + booking CTA | `/` SSR page, rates read from `rates` table, CTAs to `/book` and `/live`; distinct palette (teal + amber, NOT PicklePoint's) | done |
| P9 | Online booking with payment → reference code | `bookings` + `payments`; reference code (`PB-XXXXXXXX`) issued at creation, valid once paid; provider-agnostic webhook | done |
| P10 | Coaching sessions bookable | `booking_type` enum includes `coaching` | done |

## Architecture decisions (our standard)

- **REST API approach**: all model/controller business logic in `app/api/**` (route handlers + per-resource `controller.ts`; shared guards/validation in `app/api/_lib/`). Frontend NEVER queries Supabase tables directly for mutations — it calls `/services/*` which call the REST API. (Read-only realtime subscriptions on public tables are the one allowed direct-Supabase use.)
- **`/services` folder** (new, at repo root): one file per API category — `courts.ts`, `queue.ts`, `matches.ts`, `bookings.ts`, `payments.ts` — plus a shared `http.ts` fetch wrapper.
- **App folder standard**: page-scoped code lives in `components/` and `helpers/` folders under that route; reusable helpers go to root `helpers/`. Reuse before rewrite.
- **SSR-first**: pages fetch initial data on the server; state that belongs in the URL (selected date, court, tab) uses search params, awaited via the async `searchParams` prop. Client components only for interactivity (forms, realtime refresh).
- **Next 16 specifics**: `proxy.ts` (not `middleware.ts`); `params`/`searchParams` are Promises.

## DB schema (expandable)

- `courts` — id, name, court_type, status (`open`/`maintenance`/`closed`), is_active, sort_order
- `players` — walk-in or account-linked (nullable `profile_id`), display_name, skill_level
- `queue_entries` — player_id, status (`waiting`/`called`/`playing`/`done`/`cancelled`), joined_at (FIFO position derived, not stored)
- `matches` — court_id, status (`active`/`completed`/`cancelled`), started_at, ends_at, ended_at
- `match_players` — match_id, player_id (junction, supports 2 or 4)
- `bookings` — reference_code, booking_type (`private_rental`/`coaching`), court_id, customer fields, starts_at/ends_at, players_count, amount_cents, status (`pending_payment`/`confirmed`/`cancelled`/`completed`/`expired`)
- `payments` — booking_id, provider, provider_ref, status, amount_cents, paid_at
- `rates` — landing-page-visible pricing rows (name, description, price_cents, unit, rate_type)
- `facility_settings` — singleton row: match_duration_minutes (20), max/min players per match (4/2), open/close hours, timezone — editable at /admin/settings
- `profiles` — one row per auth user, auto-created by `handle_new_user()` trigger on `auth.users` insert (self-signup AND admin-created users); email/role kept in sync by `handle_user_updated()`. `role` is a display-only mirror — authorization stays on `is_admin()`/JWT. `players.profile_id` now references `profiles`.
- Future expansion parked: memberships, tournaments, leaderboards, SMS notifications, player accounts self-service queue join.

## Loopholes identified & mitigations

| # | Loophole | Mitigation | Status |
|---|---|---|---|
| L1 | Double-booking a court for overlapping times | Postgres exclusion constraint (`btree_gist`) on court + time range for non-cancelled bookings — race-proof at DB level, not just app checks | done |
| L2 | Client-side price tampering | Amount computed server-side from `rates`; client never sends a price | done |
| L3 | Fake "payment confirmed" calls | Webhook requires HMAC signature (`PAYMENT_WEBHOOK_SECRET`); bookings only flip to `confirmed` via verified webhook | done |
| L4 | Booking spam holding all slots as `pending_payment` | `expires_at` on pending bookings; expired pendings don't block availability; matchmaking/availability ignores them | done |
| L5 | Same player queued twice | Partial unique index: one active (`waiting`/`called`/`playing`) queue entry per player | done |
| L6 | Matchmaking race: two admins allocate same players/court | Allocation runs in a single controller path using an atomic claim (status transition guarded by `WHERE status = 'waiting'`), court claimed via active-match uniqueness (one active match per court — partial unique index) | done |
| L7 | 3 players allocated (invalid pickleball match) | Allocator only ever takes exactly 4 or exactly 2 | done |
| L8 | Reference code guessable / enumerable | Crypto-random 8-char code from unambiguous alphabet; lookup returns sanitized fields only; no list endpoint for anon | done |
| L9 | Bookings for past dates or outside open hours | Zod + server validation against `facility_settings` open hours and `now()` | done |
| L10 | Court deleted while match active / bookings exist | Soft-delete (`is_active = false`); FK `on delete restrict` for matches/bookings | done |
| L11 | Private booking and open-play match colliding on one court | Hard separation: `private_rental` bookings allowed on `vip` courts only; matchmaking allocates `open_play` courts only — enforced in controllers | done |
| L12 | Match overruns 20 min with no rotation (no cron yet) | Dashboard shows overdue state; admin "end & refill" is one click; `pg_cron` / Vercel Cron auto-rotation listed as follow-up | follow-up |
| L13 | RLS policies without table GRANTs → "permission denied" (found in live verification) | `20260707034700_role_grants.sql`: explicit per-table grants (anon = select on dashboard tables only; authenticated = writes guarded by RLS; service_role = all). New tables need explicit grants in their migration | done |

## Security checklist

| # | Item | Approach | Status |
|---|---|---|---|
| S1 | RLS on every `public` table | Enabled on all tables; public read only on dashboard-safe tables (courts, matches, match_players, players, queue_entries, rates, facility_settings); bookings/payments have NO anon read | done |
| S2 | Admin role | `app_metadata.role = 'admin'` (never `user_metadata` — user-editable); SQL helper `is_admin()` reads JWT app_metadata; API guard `requireAdmin()` re-checks server-side | done |
| S3 | Admin route protection | `proxy.ts` optimistic redirect for `/admin/**` + hard check in every admin API controller (proxy is not the auth boundary) | done |
| S4 | Secret key hygiene | Admin client is `server-only`, key `SUPABASE_SECRET_KEY` (no `NEXT_PUBLIC_`); used only in controllers after validation | done |
| S5 | Input validation | Zod schemas on every API body/query param; unknown keys stripped | done |
| S6 | Payment webhook verification | HMAC-SHA256 signature check, timing-safe compare; mock provider only active when `PAYMENTS_PROVIDER=mock` AND not production | done |
| S7 | UPDATE policies have USING + WITH CHECK | Applied in migration | done |
| S8 | No PII leakage on public pages | Queue/dashboard shows `display_name` only; booking lookup returns no email/phone unless exact reference match | done |
| S9 | Rate limiting | Deferred to platform (Vercel WAF / firewall rules) — documented as a follow-up before production | deferred |
| S10 | Realtime exposure | Realtime publication limited to the dashboard-safe tables in S1 | done |

## Action items (build order)

1. [x] Save this doc, re-review coverage & loopholes (this file)
2. [x] Install `zod`; create initial migration via `supabase migration new`
3. [x] Migration: extensions, enums, tables, constraints (L1, L5, L6 partial unique), `is_admin()`, RLS policies, `updated_at` triggers, realtime publication
4. [x] Seeders: 6 courts, rates, facility settings, dev admin user (local only)
5. [x] Hand-write `config/supabase/types.ts` (Docker unavailable → can't `gen types` yet; regenerate with `make generate-types` once Docker is enabled)
6. [x] `app/api/_lib/`: http helpers, `requireAdmin`, matchmaking engine (pure + testable), reference code generator, slot/availability helpers
7. [x] API routes: courts, queue, matches (+allocate/end), bookings (+availability, reference lookup), payments webhook (+mock checkout)
8. [x] `/services`: http.ts + per-category service files
9. [x] Pages: `/` landing (SSR rates), `/live` (SSR + realtime refresh), `/book` (SSR availability via searchParams + form), `/bookings/[reference]` (confirmation), `/admin` (courts/queue/matches tabs), `/admin/login`
10. [x] `proxy.ts` session refresh + `/admin` gate
11. [x] Theme palette (teal/amber) in `globals.css`
12. [x] Unit tests: matchmaking allocator, reference code, booking validation
13. [x] Update CLAUDE.md with the new standards
14. [x] Verify: lint, tests, build; re-check this file and mark statuses

## Verification log (2026-07-07, live local stack)

- `supabase db reset` — both migrations + both seeders apply cleanly
- GET `/api/courts` → 6 seeded courts; availability → VIP courts only, 14 hourly slots
- POST `/api/bookings` → `PB-…` reference, ₱1,200 for 2h (server-priced); client-sent `amountCents: 1` ignored (L2 ✓); overlapping second booking → 409 via exclusion constraint (L1 ✓)
- Webhook without signature → 401 (L3 ✓); mock pay → booking `confirmed`, payment `paid`
- Anon on admin endpoints → 401; `/admin` page → 307 to login (S3 ✓)
- Seeded admin login OK; 6 walk-ins → allocation `[4, 2]` FIFO (P3/L7 ✓); end + re-queue + auto-fill → `[4]` new match, players rotated (P4/P5 ✓)
- `/live` and `/` render live DB data; unit tests 21 passed, lint clean, build green

## Follow-ups before production

- Real payment provider integration (PayMongo/Stripe) replacing the mock; keep the webhook contract
- Auto-rotation cron (L12) and pending-booking expiry cron (currently lazy)
- Rate limiting at the platform edge (S9)
- Admin user provisioning flow (dashboard-based; remove dev seeder from prod pipelines)
