import 'server-only'

import { z } from 'zod'
import { requirePlayer } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'

export const followSchema = z.object({
  playerId: z.uuid(),
})

export const listFollowsSchema = z.object({
  type: z.enum(['following', 'followers']).default('following'),
})

// The follow graph is read through the caller's own client: RLS only returns
// edges they are an endpoint of (S12).
export async function listFollows(input: z.infer<typeof listFollowsSchema>) {
  const { player, supabase } = await requirePlayer()

  const query =
    input.type === 'following'
      ? supabase
          .from('follows')
          .select('created_at, player:players!follows_followee_id_fkey(id, display_name, skill_level)')
          .eq('follower_id', player.id)
      : supabase
          .from('follows')
          .select('created_at, player:players!follows_follower_id_fkey(id, display_name, skill_level)')
          .eq('followee_id', player.id)

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
  if (error) throw new ApiError(500, error.message)

  return data
    .filter((row) => row.player !== null)
    .map((row) => ({ ...row.player!, followedAt: row.created_at }))
}

// P11: following is what unlocks inviting. It is one-directional and needs no
// approval — the invite itself is the consent point.
export async function followPlayer(input: z.infer<typeof followSchema>) {
  const { player, supabase } = await requirePlayer()

  if (input.playerId === player.id) throw new ApiError(400, 'You cannot follow yourself')

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: player.id, followee_id: input.playerId })

  if (error?.code === '23505') throw new ApiError(409, 'You already follow that player')
  if (error?.code === '23503') throw new ApiError(404, 'That player does not exist')
  if (error) throw new ApiError(500, error.message)

  return { followerId: player.id, followeeId: input.playerId }
}

export async function unfollowPlayer(playerId: string) {
  const { player, supabase } = await requirePlayer()

  const { data, error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', player.id)
    .eq('followee_id', playerId)
    .select('followee_id')

  if (error) throw new ApiError(500, error.message)
  if (!data || data.length === 0) throw new ApiError(404, 'You do not follow that player')

  return { followerId: player.id, followeeId: playerId }
}
