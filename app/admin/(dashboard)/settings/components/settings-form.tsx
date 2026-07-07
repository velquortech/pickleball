'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateSettings } from '@/services/settings'
import { ServiceError } from '@/services/http'
import type { FacilitySettings } from '@/config/supabase/models'

function formatHour(hour: number) {
  const suffix = hour < 12 ? 'AM' : 'PM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:00 ${suffix}`
}

export function SettingsForm({ settings }: { settings: FacilitySettings }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [maxPlayers, setMaxPlayers] = useState(String(settings.max_players_per_match))
  const [openHour, setOpenHour] = useState(String(settings.open_hour))
  const [closeHour, setCloseHour] = useState(String(settings.close_hour))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try {
      await updateSettings({
        matchDurationMinutes: Number(form.get('matchDurationMinutes')),
        bookingHoldMinutes: Number(form.get('bookingHoldMinutes')),
        maxPlayersPerMatch: Number(maxPlayers) as 2 | 4,
        openHour: Number(openHour),
        closeHour: Number(closeHour),
      })
      toast.success('Settings saved')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof ServiceError ? error.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open play</CardTitle>
          <CardDescription>
            Controls the matchmaking engine — applies to the next allocation, not
            matches already in play.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="matchDurationMinutes">Match duration (minutes)</Label>
            <Input
              id="matchDurationMinutes"
              name="matchDurationMinutes"
              type="number"
              min={5}
              max={120}
              defaultValue={settings.match_duration_minutes}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxPlayersPerMatch">Players per court</Label>
            <Select value={maxPlayers} onValueChange={(value) => value && setMaxPlayers(value)}>
              <SelectTrigger id="maxPlayersPerMatch" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Doubles first (4)</SelectItem>
                <SelectItem value="2">Singles only (2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hours &amp; bookings</CardTitle>
          <CardDescription>
            Booking slots are generated inside these hours; pending bookings hold
            their slot for the hold time below.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="openHour">Opens</Label>
            <Select value={openHour} onValueChange={(value) => value && setOpenHour(value)}>
              <SelectTrigger id="openHour" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {formatHour(hour)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="closeHour">Closes</Label>
            <Select value={closeHour} onValueChange={(value) => value && setCloseHour(value)}>
              <SelectTrigger id="closeHour" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, index) => {
                  const hour = index + 1
                  return (
                    <SelectItem key={hour} value={String(hour)}>
                      {formatHour(hour % 24)}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bookingHoldMinutes">Payment hold (minutes)</Label>
            <Input
              id="bookingHoldMinutes"
              name="bookingHoldMinutes"
              type="number"
              min={5}
              max={120}
              defaultValue={settings.booking_hold_minutes}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving} className="w-fit">
        {saving ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  )
}
