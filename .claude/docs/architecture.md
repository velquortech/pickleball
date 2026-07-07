# Architecture

## REST API approach

All model/controller business logic lives in `app/api/**`; the frontend calls it
through `/services`. This is the standard moving forward:

- **`app/api/<resource>/controller.ts`** — models + controllers: validation schemas
  (zod), Supabase queries, business rules. Route files (`route.ts`) stay thin:
  parse → call controller → `ok()`/`fail()`.
- **`app/api/_lib/`** — shared API plumbing: `http.ts` (ApiError, ok/fail/parseBody),
  `auth.ts` (`requireAdmin()` — the hard authorization boundary), plus pure,
  unit-testable engines (`matchmaking.ts`, `booking-slots.ts`, `reference-code.ts`).
- **`services/`** (repo root) — the ONLY way client components call the API, one file
  per API category (`courts.ts`, `queue.ts`, `matches.ts`, `bookings.ts`,
  `payments.ts`, `settings.ts`) over the shared axios layer in `services/http.ts`:
  use `api` for public endpoints and `authApi` for staff endpoints. `authApi` is
  the client-side protection point — it refuses to fire without a Supabase
  session, attaches `Authorization: Bearer <token>`, and redirects to
  `/admin/login` on 401. Server-side, `requireAdmin()` accepts the session cookie
  OR the bearer token. Client components never query Supabase tables directly
  (exception: read-only Realtime subscriptions on public tables, e.g. the live
  dashboard refresher).
- **Server pages reuse controllers directly** (no HTTP hop): e.g. `/live` and `/book`
  import `listQueue`/`getAvailability` from the controllers.

## App folder standard

- Page-scoped code lives under the route: `app/<route>/components/` and
  `app/<route>/helpers/`. Only promote to the global folders (`components/site/`,
  root `helpers/`) when something is reused by 2+ pages. Always reuse before rewriting.
- **SSR-first**: pages fetch initial data on the server. UI state that should survive
  refresh/sharing goes in URL search params (awaited `searchParams` prop), e.g.
  `/book?type=&date=&courtId=&startsAt=` and `/admin?tab=`. Client components are
  only for interactivity (forms, realtime, countdowns) and mutate via `/services`
  then `router.refresh()`.
- **Next 16**: `proxy.ts` (not `middleware.ts`); `params`/`searchParams` are Promises.
  This repo's Next has breaking changes — check `node_modules/next/dist/docs/` first.

## Directory structure

```
app/
  api/                    # REST API: <resource>/controller.ts + route.ts, shared _lib/
  components/, helpers/   # landing-page-scoped pieces
  live/                   # public realtime dashboard (+ components/, helpers/)
  book/                   # booking flow, URL-param driven (+ components/, helpers/)
  bookings/[reference]/   # booking confirmation / payment page
  admin/                  # staff area, guarded by proxy.ts + requireAdmin
    (dashboard)/          #   sidebar dashboard shell (layout.tsx) + tab panels
    login/                #   split-screen staff sign-in (outside the shell)
components/site/          # shared chrome (header, footer, court illustration)
components/ui/            # shadcn components (owned source — extend here)
config/supabase/          # Supabase clients + types
  client.ts               #   browser client (Client Components only)
  server.ts               #   server client (Server Components/Actions/Route Handlers)
  admin.ts                #   secret-key client (server-only, bypasses RLS — use sparingly)
  bearer.ts               #   token-scoped server client (authApi bearer transport)
  types.ts                #   GENERATED (make generate-types) — do not hand-edit
  models.ts               #   friendly Row/Enum aliases — import types from here
services/                 # client → API callers, one file per API category
helpers/                  # global reusable helpers (formatting, dates, live data)
lib/                      # shared utilities (cn, etc.)
public/images/            # branded placeholder art (see its README to swap photos)
supabase/
  config.toml             # local stack config
  migrations/             # SQL migrations (create via make migrate-new)
  seeders/                # SQL seeders, run in filename order on db reset
__tests__/
  unit/                   # jsdom tests (components, hooks, utils, pure engines)
  integration/            # node tests against the local Supabase stack
__mocks__/                # shared Jest mocks
proxy.ts                  # session refresh + optimistic /admin gate (Next 16 middleware)
.claude/                  # categorized standards (docs/) + planning docs
```
