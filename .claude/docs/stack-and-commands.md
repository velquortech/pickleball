# Stack & Commands

## Stack

- **Framework**: Next.js 16 (App Router) — has breaking changes vs older versions; check `node_modules/next/dist/docs/` before writing code
- **UI**: shadcn/ui + Tailwind CSS v4 — see the design system doc
- **Database/Auth**: Supabase (local dev via Supabase CLI + Docker)
- **Testing**: Jest (unit + integration) + React Testing Library
- **Package manager**: yarn

## Commands

| Command | Purpose |
|---|---|
| `make setup-supabase` | Start local Supabase and auto-generate `.env` with all Supabase vars |
| `make run-dev` | Start Supabase + Next.js dev server |
| `make stop-db` | Stop the local Supabase stack |
| `make clean` | Stop Supabase and remove `.env` |
| `make migrate-new name=<name>` | Create a new migration file |
| `make migrate-up` | Apply pending migrations |
| `make migrate-diff` | Diff local schema changes into a migration file |
| `make migrate-reset` / `make seed` | Reset DB — reruns all migrations then seeders |
| `make generate-types` | Regenerate `config/supabase/types.ts` from the local schema |
| `make build-app` | Lint + production build |
| `yarn test` | Run all tests (unit + integration) |
| `yarn test:unit` / `yarn test:integration` | Run a single test project |
| `yarn test:watch` | Watch mode |

## Environment variables

Generated automatically by `make setup-supabase` — do not commit `.env`.

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_APP_URL` | App origin (http://localhost:3000 in dev) |
| `NEXT_PUBLIC_SUPABASE_URL` | Local API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Safe for the browser |
| `SUPABASE_SECRET_KEY` | Server-only — never expose to the client |
| `SUPABASE_DB_URL` | Direct Postgres connection string |
| `PAYMENTS_PROVIDER` | `mock` in dev; real provider name in production |
| `PAYMENT_WEBHOOK_SECRET` | HMAC key for payment webhook verification |

## Local stack troubleshooting

- **Sign-in fails with `An invalid response was received from the upstream server`
  right after `make seed` / `db reset`.** The reset restarts containers and Kong
  caches the old auth container IP. Nothing is wrong with the seeders or the
  schema — restart the gateway:
  `docker restart supabase_kong_<project>`. Symptom: `curl` to
  `/auth/v1/token` returns the upstream error while
  `docker exec supabase_auth_<project> wget -qO- localhost:9999/health` is fine.
- **`db reset` exits with `error running container: exit 1`.** A stack container
  died. `yarn supabase stop && yarn supabase start --ignore-health-check`, then
  reset again.
