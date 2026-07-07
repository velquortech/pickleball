import 'server-only'

import { z } from 'zod'
import { createClient } from '@/config/supabase/server'
import { requireAdmin } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'

export const createCourtSchema = z.object({
  name: z.string().trim().min(1).max(60),
  courtType: z.enum(['open_play', 'vip']).default('open_play'),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateCourtSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  courtType: z.enum(['open_play', 'vip']).optional(),
  status: z.enum(['open', 'maintenance', 'closed']).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export async function listCourts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new ApiError(500, error.message)
  return data
}

export async function createCourt(input: z.infer<typeof createCourtSchema>) {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('courts')
    .insert({
      name: input.name,
      court_type: input.courtType,
      sort_order: input.sortOrder,
    })
    .select()
    .single()

  if (error?.code === '23505') throw new ApiError(409, 'A court with that name already exists')
  if (error) throw new ApiError(500, error.message)
  return data
}

export async function updateCourt(id: string, input: z.infer<typeof updateCourtSchema>) {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('courts')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.courtType !== undefined && { court_type: input.courtType }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.sortOrder !== undefined && { sort_order: input.sortOrder }),
    })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error?.code === '23505') throw new ApiError(409, 'A court with that name already exists')
  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'Court not found')
  return data
}

// Soft delete (L10): courts with history are never hard-deleted.
export async function deactivateCourt(id: string) {
  const { supabase } = await requireAdmin()

  const { data: activeMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('court_id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (activeMatch) {
    throw new ApiError(409, 'Court has an active match — end it first')
  }

  const { data, error } = await supabase
    .from('courts')
    .update({ is_active: false, status: 'closed' })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'Court not found')
  return data
}
