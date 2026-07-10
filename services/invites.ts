import { playerApi } from './http'
import type { InviteStatus } from '@/config/supabase/models'

export type Invite = {
  id: string
  status: InviteStatus
  expires_at: string
  created_at: string
  match: {
    id: string
    capacity: number
    status: string
    court: { id: string; name: string } | null
  } | null
  inviter: { id: string; display_name: string } | null
  invitee: { id: string; display_name: string } | null
}

export function getInvites() {
  return playerApi.get<{ received: Invite[]; sent: Invite[] }>('/api/invites')
}

export function inviteToCourt(matchId: string, inviteeId: string) {
  return playerApi.post<{ inviteId: string; expiresAt: string }>('/api/invites', {
    matchId,
    inviteeId,
  })
}

export function respondToInvite(inviteId: string, action: 'accept' | 'decline') {
  return playerApi.patch<{
    inviteId: string
    status: 'accepted' | 'declined'
    started: boolean
    matchId?: string
  }>(`/api/invites/${inviteId}`, { action })
}

export function cancelInvite(inviteId: string) {
  return playerApi.delete<{ inviteId: string; status: 'cancelled' }>(
    `/api/invites/${inviteId}`
  )
}
