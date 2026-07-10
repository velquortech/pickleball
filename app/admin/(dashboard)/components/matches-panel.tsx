'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { endMatch, type ActiveMatch } from '@/services/matches'
import { ServiceError } from '@/services/http'
import { MatchCountdown } from '@/components/site/match-countdown'

export function MatchesPanel({ matches }: { matches: ActiveMatch[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleEnd(id: string, rejoinQueue: boolean) {
    setBusyId(id)
    try {
      await endMatch(id, { rejoinQueue, autoFill: true })
      toast.success(rejoinQueue ? 'Match ended — players re-queued' : 'Match ended')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof ServiceError ? error.message : 'Could not end the match')
    } finally {
      setBusyId(null)
    }
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No matches in play. Use the Queue tab to fill open courts.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((match) => (
        <Card key={match.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{match.court.name}</CardTitle>
            <MatchCountdown endsAt={match.ends_at} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1">
              {match.match_players.map(({ player }) => (
                <Badge key={player.id} variant="secondary">
                  {player.display_name}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === match.id}
                onClick={() => handleEnd(match.id, false)}
              >
                End match
              </Button>
              <Button
                size="sm"
                disabled={busyId === match.id}
                onClick={() => handleEnd(match.id, true)}
              >
                End &amp; re-queue
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
