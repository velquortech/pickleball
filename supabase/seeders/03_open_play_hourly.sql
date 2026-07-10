-- Open play is now sold as prepaid playing time: players buy hours up front and
-- spend them one match at a time. Re-price the seeded rate accordingly.
-- Idempotent: safe to re-run on every `make seed`.

update public.rates
set
  unit = 'per hour',
  description = 'Buy playing time by the hour, then queue, stack onto a court, or invite friends. Minutes are spent per match.'
where rate_type = 'open_play';
