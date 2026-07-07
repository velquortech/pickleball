// Hourly slot computation for private rentals/coaching. Pure — unit-testable.

export type BusyRange = { starts_at: string; ends_at: string }

export type Slot = {
  startsAt: string
  endsAt: string
  hour: number
  available: boolean
}

// IANA timezone → ISO offset string (e.g. Asia/Manila → "+08:00") for a date.
export function tzOffsetISO(timezone: string, date: Date): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value

  const match = formatted?.match(/GMT([+-]\d{2}:\d{2})/)
  return match ? match[1] : '+00:00'
}

export function buildDaySlots(
  dateISO: string, // 'YYYY-MM-DD' in facility timezone
  options: {
    openHour: number
    closeHour: number
    timezone: string
    busy: BusyRange[]
    now?: Date
  }
): Slot[] {
  const { openHour, closeHour, timezone, busy } = options
  const now = options.now ?? new Date()
  const offset = tzOffsetISO(timezone, now)

  const slots: Slot[] = []
  for (let hour = openHour; hour < closeHour; hour++) {
    const startsAt = new Date(
      `${dateISO}T${String(hour).padStart(2, '0')}:00:00${offset}`
    )
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)

    const overlapsBusy = busy.some((range) => {
      const busyStart = new Date(range.starts_at)
      const busyEnd = new Date(range.ends_at)
      return startsAt < busyEnd && endsAt > busyStart
    })

    slots.push({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      hour,
      available: !overlapsBusy && startsAt > now,
    })
  }
  return slots
}
