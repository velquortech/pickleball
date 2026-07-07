import 'server-only'

import { z } from 'zod'
import { createClient } from '@/config/supabase/server'
import { requireAdmin } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'

export const addWalkInSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  playerId: z.uuid().optional(), // rejoin an existing player
  skillLevel: z.string().trim().max(40).optional(),
})

export const updateQueueEntrySchema = z.object({
  status: z.literal('cancelled'),
})

// Public: active queue with FIFO positions (the /live page shows this too).
export async function listQueue() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('queue_entries')
    .select('id, status, joined_at, called_at, player:players(id, display_name, skill_level)')
    .in('status', ['waiting', 'called', 'playing'])
    .order('joined_at')

  if (error) throw new ApiError(500, error.message)

  let position = 0
  return data.map((entry) => ({
    ...entry,
    position: entry.status === 'waiting' ? ++position : null,
  }))
}

// Admin: add a walk-in to the queue — brand-new player or a returning one.
export async function addWalkIn(input: z.infer<typeof addWalkInSchema>) {
  const { supabase } = await requireAdmin()

  let playerId = input.playerId
  if (!playerId) {
    if (!input.displayName) {
      throw new ApiError(400, 'displayName is required for new players')
    }
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        display_name: input.displayName,
        skill_level: input.skillLevel ?? null,
      })
      .select()
      .single()

    if (error) throw new ApiError(500, error.message)
    playerId = player.id
  }

  const { data, error } = await supabase
    .from('queue_entries')
    .insert({ player_id: playerId })
    .select('id, status, joined_at, called_at, player:players(id, display_name, skill_level)')
    .single()

  // L5: partial unique index — one active queue entry per player.
  if (error?.code === '23505') throw new ApiError(409, 'Player is already in the queue')
  if (error) throw new ApiError(500, error.message)
  return data
}

export async function cancelQueueEntry(id: string) {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('queue_entries')
    .update({ status: 'cancelled', left_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['waiting', 'called'])
    .select()
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'Queue entry not found or already playing')
  return data
}
