# Supabase Rules

- Import clients from `config/supabase/` — never call `createBrowserClient`/`createServerClient` inline in features.
- `admin.ts` (secret key) is server-only and RLS-bypassing: only for genuinely privileged operations. The secret key env var must never be `NEXT_PUBLIC_`-prefixed.
- Schema changes go through migrations: `make migrate-new name=<change>` → write SQL → `make migrate-up`. Never edit an applied migration; add a new one.
- Every table in `public` gets RLS enabled with policies scoped `TO authenticated`/`TO anon` **plus** an ownership predicate (`(select auth.uid()) = user_id`). UPDATE policies need both `USING` and `WITH CHECK`.
- **New tables also need explicit GRANTs** — the local CLI does not auto-grant on
  SQL-created tables (RLS policies alone yield "permission denied"). Follow the
  pattern in `supabase/migrations/*role_grants.sql`.
- Never use `user_metadata` for authorization (user-editable); use `app_metadata`.
- Every auth user gets a `profiles` row automatically via the `handle_new_user()`
  trigger on `auth.users` (covers self-signup and admin-created users).
  `profiles.role` is a display-only mirror — never use it for authorization.
- Trigger functions that must be `SECURITY DEFINER` get an empty `search_path`
  and `EXECUTE` revoked from `public, anon, authenticated`.
- Seeders live in `supabase/seeders/*.sql`, run in filename order, and should be idempotent (`ON CONFLICT DO NOTHING`).
- After any schema change: `make generate-types` to refresh `config/supabase/types.ts`
  (generated — hand-edit `models.ts` aliases instead).
