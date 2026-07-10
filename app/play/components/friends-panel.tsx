'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ServiceError } from '@/services/http'
import { followPlayer, unfollowPlayer, type FollowedPlayer } from '@/services/follows'
import { searchPlayers, type PlayerSummary } from '@/services/players'
import { inviteToCourt } from '@/services/invites'

type Props = {
  following: FollowedPlayer[]
  // The forming court the player is currently on — the only court they may
  // invite friends onto (P11).
  invitableMatchId: string | null
  openSlots: number
}

export function FriendsPanel({ following, invitableMatchId, openSlots }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [results, setResults] = useState<PlayerSummary[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = String(new FormData(event.currentTarget).get('search') ?? '').trim()
    if (term.length < 2) {
      toast.error('Search for at least 2 characters')
      return
    }

    setSearching(true)
    try {
      setResults(await searchPlayers(term))
    } catch (error) {
      toast.error(error instanceof ServiceError ? error.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function run(id: string, action: () => Promise<unknown>, success: string) {
    setBusyId(id)
    action()
      .then(() => {
        toast.success(success)
        setResults(null)
        startTransition(() => router.refresh())
      })
      .catch((error) => {
        toast.error(error instanceof ServiceError ? error.message : 'Something went wrong')
      })
      .finally(() => setBusyId(null))
  }

  const followedIds = new Set(following.map((friend) => friend.id))
  const canInvite = Boolean(invitableMatchId) && openSlots > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base font-bold uppercase tracking-tight">
          Friends
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-2">
          <Label htmlFor="search">Find players</Label>
          <div className="flex gap-2">
            <Input id="search" name="search" placeholder="Search by name" autoComplete="off" />
            <Button type="submit" variant="outline" disabled={searching}>
              {searching ? '…' : 'Search'}
            </Button>
          </div>
        </form>

        {results !== null && (
          <div className="flex flex-col gap-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No players matched that name.</p>
            ) : (
              results.map((player) => (
                <div key={player.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{player.display_name}</span>
                  {followedIds.has(player.id) ? (
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      Following
                    </span>
                  ) : (
                    <Button
                      size="xs"
                      disabled={busyId === player.id || pending}
                      onClick={() =>
                        run(player.id, () => followPlayer(player.id), `Following ${player.display_name}`)
                      }
                    >
                      Follow
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Following · {following.length}
          </span>

          {following.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Follow a player to invite them onto your court.
            </p>
          ) : (
            following.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">{friend.display_name}</span>
                <div className="flex shrink-0 gap-1">
                  {canInvite && (
                    <Button
                      size="xs"
                      disabled={busyId === friend.id || pending}
                      onClick={() =>
                        run(
                          friend.id,
                          () => inviteToCourt(invitableMatchId!, friend.id),
                          `Invited ${friend.display_name}`
                        )
                      }
                    >
                      Invite
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={busyId === friend.id || pending}
                    onClick={() =>
                      run(friend.id, () => unfollowPlayer(friend.id), `Unfollowed ${friend.display_name}`)
                    }
                  >
                    Unfollow
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {!canInvite && following.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Claim a court with an open seat to invite your friends onto it.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
