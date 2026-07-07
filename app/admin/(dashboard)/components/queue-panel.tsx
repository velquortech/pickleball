'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addWalkIn, cancelQueueEntry, type QueueItem } from '@/services/queue'
import { allocateMatches } from '@/services/matches'
import { ServiceError } from '@/services/http'

function errorMessage(error: unknown) {
  return error instanceof ServiceError ? error.message : 'Something went wrong'
}

export function QueuePanel({ queue }: { queue: QueueItem[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const waiting = queue.filter((entry) => entry.status === 'waiting')

  async function handleAddWalkIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    try {
      await addWalkIn({
        displayName: String(data.get('displayName') ?? ''),
        skillLevel: String(data.get('skillLevel') ?? '') || undefined,
      })
      form.reset()
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleFillCourts() {
    setBusy(true)
    try {
      const result = await allocateMatches()
      toast.success(
        result.created.length > 0
          ? `Started ${result.created.length} match${result.created.length === 1 ? '' : 'es'}`
          : 'No free courts or not enough waiting players'
      )
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelQueueEntry(id)
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add walk-in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddWalkIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Player name</Label>
              <Input id="displayName" name="displayName" required maxLength={60} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="skillLevel">Skill level (optional)</Label>
              <Input id="skillLevel" name="skillLevel" placeholder="e.g. 3.5" maxLength={40} />
            </div>
            <Button type="submit" disabled={busy}>
              Add to queue
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Waiting</CardTitle>
            <Badge variant="secondary">{waiting.length}</Badge>
          </div>
          <Button onClick={handleFillCourts} disabled={busy || waiting.length < 2}>
            Fill open courts
          </Button>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is waiting right now.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {waiting.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs">
                      {entry.position}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {entry.player.display_name}
                    </span>
                    {entry.player.skill_level && (
                      <Badge variant="outline">{entry.player.skill_level}</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(entry.id)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
