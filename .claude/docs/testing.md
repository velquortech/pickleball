# Testing Rules

Two Jest projects (see `jest.config.ts`): `unit` (jsdom) and `integration` (node).

## Rules

- Unit tests → `__tests__/unit/`, run in jsdom, use React Testing Library; query by
  role/label (`getByRole`), not test IDs, where possible. Base UI link-buttons
  (`<Button render={<Link/>}>`) render as `<a role="button">` — query by the
  **button** role.
- Integration tests → `__tests__/integration/`, run in node against the local
  Supabase stack; they must skip gracefully when env vars are absent
  (`const describeIf = url && key ? describe : describe.skip`). Create unique,
  timestamped test data and clean up in `afterAll`; use far-future time windows
  so constraint tests never collide with dev data.
- `async` Server Components can't be unit-tested in Jest — cover them with
  integration/E2E instead.
- Client components that touch Supabase or the router: mock
  `@/config/supabase/client` and `next/navigation` (see `login-form.test.tsx`).
- New features ship with tests; bug fixes ship with a regression test.

## Suite map (what covers what)

**Unit — pure engines & helpers**
- `matchmaking.test.ts` — 4/2/never-3 allocation, FIFO planning
- `booking-slots.test.ts` — hourly slots, busy overlaps, past cutoff, tz offsets
- `reference-code.test.ts` — format, unambiguous alphabet, uniqueness
- `occupancy.test.ts` — quiet/steady/busy/packed thresholds
- `format.test.ts` — currency/date/time in Asia/Manila, minutesLeft
- `search-params.test.ts` — /book URL-state parsing + round-trip
- `admin-tabs.test.ts` — ?tab= parsing fallback

**Unit — components (RTL)**
- `button.test.tsx`, `hero.test.tsx` (live board online/offline, CTAs)
- `court-grid.test.tsx` (status states, VIP book-now, singles/doubles)
- `queue-board.test.tsx` (FIFO positions, next-up highlight, empty state)
- `match-countdown.test.tsx` (fake timers, overrun state)
- `login-form.test.tsx` (admin redirect, non-admin sign-out, auth errors)

**Integration — local Supabase stack**
- `supabase.test.ts` — stack connectivity
- `seeded-admin.test.ts` — dev admin login, app_metadata role, own-profile RLS
- `profiles.test.ts` — auth→profiles trigger + cascade delete
- `security-rls.test.ts` — anon read/write boundaries (S1/S8/L13)
- `booking-constraints.test.ts` — overlap exclusion (L1), adjacency, cancel frees slot
- `queue-match-constraints.test.ts` — one active queue entry (L5), one active match per court (L6)
- `webhook-signature.test.ts` — HMAC verification (S6/L3)
