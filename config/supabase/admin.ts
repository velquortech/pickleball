import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Admin client — bypasses RLS via the secret key. Server-side only, and only
// for operations that genuinely need elevated privileges (never for user CRUD
// that RLS should govern). SUPABASE_SECRET_KEY must never be prefixed with
// NEXT_PUBLIC_.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
