# Domain Rules (pickleball facility)

- Matchmaking allocates **exactly 4 or exactly 2** players per court (never 3),
  FIFO from the queue, open-play courts only. Matches run
  `facility_settings.match_duration_minutes` (default 20); ending a match can
  re-queue players at the back and auto-fill free courts.
- Bookings (private rental / coaching) are **VIP courts only**, hourly slots within
  open hours, price always computed server-side from `rates`. Pending bookings hold
  the slot until `expires_at`; overlap is blocked by a DB exclusion constraint.
- Bookings confirm ONLY via the signature-verified payment webhook (or the mock
  provider outside production). Reference codes: `PB-XXXXXXXX`, crypto-random.
- Admin role lives in `app_metadata.role` (never `user_metadata`). Local dev admin:
  `admin@pickleball.local` / `Admin123!` (seeded, local only).
- Facility settings (hours, match duration, booking hold) are edited at
  `/admin/settings` through `app/api/settings`.
