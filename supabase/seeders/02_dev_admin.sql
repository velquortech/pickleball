-- LOCAL DEVELOPMENT ONLY: seed an admin account for the /admin panel.
-- Email: admin@pickleball.local  Password: Admin123!
-- The admin role lives in raw_app_meta_data (app_metadata) — the only safe
-- place for authorization claims. Never grant roles via user_metadata.
-- In production, create admins through the Supabase dashboard instead.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'admin@pickleball.local',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "admin"}',
  '{}',
  now(),
  now(),
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '{"sub": "a0000000-0000-4000-8000-000000000001", "email": "admin@pickleball.local", "email_verified": true}',
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do nothing;
