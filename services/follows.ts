import { playerApi } from './http'

export type FollowedPlayer = {
  id: string
  display_name: string
  skill_level: string | null
  followedAt: string
}

export function getFollowing() {
  return playerApi.get<FollowedPlayer[]>('/api/follows?type=following')
}

export function getFollowers() {
  return playerApi.get<FollowedPlayer[]>('/api/follows?type=followers')
}

export function followPlayer(playerId: string) {
  return playerApi.post<{ followerId: string; followeeId: string }>('/api/follows', {
    playerId,
  })
}

export function unfollowPlayer(playerId: string) {
  return playerApi.delete<{ followerId: string; followeeId: string }>(
    `/api/follows/${playerId}`
  )
}
