'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createCourt, updateCourt, deactivateCourt } from '@/services/courts'
import { ServiceError } from '@/services/http'
import type { Court, CourtStatus, CourtType } from '@/config/supabase/models'

function errorMessage(error: unknown) {
  return error instanceof ServiceError ? error.message : 'Something went wrong'
}

export function CourtsPanel({ courts }: { courts: Court[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [newType, setNewType] = useState<CourtType>('open_play')

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    try {
      await createCourt({
        name: String(data.get('name') ?? ''),
        courtType: newType,
        sortOrder: courts.length + 1,
      })
      form.reset()
      toast.success('Court added')
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function handleStatusChange(id: string, status: CourtStatus) {
    try {
      await updateCourt(id, { status })
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateCourt(id)
      toast.success('Court removed')
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a court</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="court-name">Court name</Label>
              <Input id="court-name" name="name" required maxLength={60} placeholder="Court 7" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="court-type">Type</Label>
              <Select
                value={newType}
                onValueChange={(value) => value && setNewType(value as CourtType)}
              >
                <SelectTrigger id="court-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_play">Open play</SelectItem>
                  <SelectItem value="vip">VIP (bookable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy}>
              Add court
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Courts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {courts.map((court) => (
            <div
              key={court.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{court.name}</span>
                <Badge variant="outline">
                  {court.court_type === 'vip' ? 'VIP' : 'Open play'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={court.status}
                  onValueChange={(value) =>
                    value && handleStatusChange(court.id, value as CourtStatus)
                  }
                >
                  <SelectTrigger size="sm" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="ghost" size="sm">
                        Remove
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {court.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The court is deactivated (history is kept) and disappears from the
                        dashboard and booking pages. Courts with an active match can&apos;t be
                        removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeactivate(court.id)}>
                        Remove court
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {courts.length === 0 && (
            <p className="text-sm text-muted-foreground">No courts yet — add the first one.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
