-- Facility baseline: settings, rates, and 6 courts (4 open play + 2 VIP).
-- Seeders run in filename order on `make seed` / `supabase db reset`. Idempotent.

insert into public.facility_settings (id)
values (true)
on conflict (id) do nothing;

insert into public.courts (name, court_type, sort_order) values
  ('Court 1', 'open_play', 1),
  ('Court 2', 'open_play', 2),
  ('Court 3', 'open_play', 3),
  ('Court 4', 'open_play', 4),
  ('VIP Court 1', 'vip', 5),
  ('VIP Court 2', 'vip', 6)
on conflict (name) do nothing;

insert into public.rates (rate_type, name, description, price_cents, unit, sort_order)
select * from (values
  ('open_play'::public.rate_type, 'Open Play', 'Walk in, join the queue, and rotate through 20-minute matches all session long.', 20000, 'per head', 1),
  ('private_rental'::public.rate_type, 'Private Court', 'Reserve a VIP court for your own group — up to 4 players included.', 60000, 'per hour', 2),
  ('coaching'::public.rate_type, 'Coaching Session', 'One-on-one or small group coaching with a certified instructor on a VIP court.', 90000, 'per hour', 3)
) as seed(rate_type, name, description, price_cents, unit, sort_order)
where not exists (select 1 from public.rates);
