import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Server client authenticated by a caller-supplied access token (the axios
// auth layer sends `Authorization: Bearer <token>`). RLS runs as that user —
// same defense-in-depth as the cookie-based server client.
export function createBearerClient(accessToken: string) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}
