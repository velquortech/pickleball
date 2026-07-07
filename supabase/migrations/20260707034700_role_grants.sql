-- Table-level grants (coarse layer; RLS from the initial migration governs rows).
-- Newer Supabase CLI versions do not auto-grant on SQL-created tables.

grant usage on schema public to anon, authenticated, service_role;

-- Service role (server-only secret key) manages everything; RLS is bypassed.
grant all on all tables in schema public to service_role;

-- Public read for the dashboard-safe tables (S1).
grant select on
  public.courts,
  public.players,
  public.queue_entries,
  public.matches,
  public.match_players,
  public.rates,
  public.facility_settings
to anon, authenticated;

-- Authenticated staff writes — RLS admin policies (is_admin) restrict rows.
grant insert, update, delete on
  public.courts,
  public.players,
  public.queue_entries,
  public.matches,
  public.match_players,
  public.rates,
  public.facility_settings
to authenticated;

-- Bookings/payments: admin-only via RLS; NO grants for anon (S8).
grant select, insert, update, delete on
  public.bookings,
  public.payments
to authenticated;

-- Future tables created by migrations (postgres role) get the same defaults
-- for service_role; public tables should be granted explicitly per table.
alter default privileges in schema public
  grant all on tables to service_role;
