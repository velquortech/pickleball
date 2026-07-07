import 'server-only'

import { headers } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/config/supabase/server'
import { createBearerClient } from '@/config/supabase/bearer'
import { ApiError } from './http'

function assertAdmin(user: User) {
  if (user.app_metadata?.role !== 'admin') {
    throw new ApiError(403, 'Admin access required')
  }
}

// Hard authorization boundary for admin endpoints (S3). proxy.ts only does an
// optimistic redirect — every admin controller must call this.
// Accepts either auth transport:
//   1. Supabase session cookie (browser navigation / SSR)
//   2. Authorization: Bearer <access_token> (the axios auth layer, API clients)
// Role comes from app_metadata (server-controlled), never user_metadata.
// Returns a client scoped to that user so admin writes also pass through RLS
// (defense in depth on top of this guard).
export async function requireAdmin() {
  const cookieClient = await createClient()
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser()

  if (cookieUser) {
    assertAdmin(cookieUser)
    return { user: cookieUser, supabase: cookieClient }
  }

  const authorization = (await headers()).get('authorization')
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (token) {
    const bearerClient = createBearerClient(token)
    const {
      data: { user },
    } = await bearerClient.auth.getUser(token)

    if (user) {
      assertAdmin(user)
      return { user, supabase: bearerClient }
    }
  }

  throw new ApiError(401, 'Authentication required')
}
