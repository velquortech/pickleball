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

// Resolves the caller through either auth transport:
//   1. Supabase session cookie (browser navigation / SSR)
//   2. Authorization: Bearer <access_token> (the axios auth layer, API clients)
// Returns a client scoped to that user so writes also pass through RLS
// (defense in depth on top of the guards below).
export async function requireUser() {
  const cookieClient = await createClient()
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser()

  if (cookieUser) return { user: cookieUser, supabase: cookieClient }

  const authorization = (await headers()).get('authorization')
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (token) {
    const bearerClient = createBearerClient(token)
    const {
      data: { user },
    } = await bearerClient.auth.getUser(token)

    if (user) return { user, supabase: bearerClient }
  }

  throw new ApiError(401, 'Authentication required')
}

// Hard authorization boundary for admin endpoints (S3). proxy.ts only does an
// optimistic redirect — every admin controller must call this.
// Role comes from app_metadata (server-controlled), never user_metadata.
export async function requireAdmin() {
  const { user, supabase } = await requireUser()
  assertAdmin(user)
  return { user, supabase }
}

// Hard authorization boundary for player endpoints (S13). Every registered
// account owns exactly one player row (created by the on_profile_created
// trigger), and that row's id — never a client-supplied one — is who queues,
// stacks, invites, and gets charged.
export async function requirePlayer() {
  const { user, supabase } = await requireUser()

  const { data: player, error } = await supabase
    .from('players')
    .select('id, display_name, skill_level')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!player) throw new ApiError(403, 'This account has no player profile')

  return { user, player, supabase }
}
