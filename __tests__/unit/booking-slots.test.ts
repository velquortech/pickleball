import { buildDaySlots, tzOffsetISO } from '@/app/api/_lib/booking-slots'

const MANILA = 'Asia/Manila'

describe('tzOffsetISO', () => {
  it('resolves Manila to +08:00', () => {
    expect(tzOffsetISO(MANILA, new Date('2026-07-08T00:00:00Z'))).toBe('+08:00')
  })
})

describe('buildDaySlots', () => {
  const base = {
    openHour: 8,
    closeHour: 22,
    timezone: MANILA,
    busy: [],
    // midnight Manila time on the booking day — every slot is in the future
    now: new Date('2026-07-07T16:00:00Z'),
  }

  it('creates one slot per open hour', () => {
    const slots = buildDaySlots('2026-07-08', base)

    expect(slots).toHaveLength(14) // 8..21
    expect(slots[0].hour).toBe(8)
    expect(slots[0].startsAt).toBe(new Date('2026-07-08T08:00:00+08:00').toISOString())
    expect(slots.at(-1)?.hour).toBe(21)
  })

  it('marks slots overlapping existing bookings as unavailable', () => {
    const slots = buildDaySlots('2026-07-08', {
      ...base,
      busy: [
        {
          starts_at: new Date('2026-07-08T10:00:00+08:00').toISOString(),
          ends_at: new Date('2026-07-08T12:00:00+08:00').toISOString(),
        },
      ],
    })

    const byHour = Object.fromEntries(slots.map((slot) => [slot.hour, slot.available]))
    expect(byHour[9]).toBe(true)
    expect(byHour[10]).toBe(false)
    expect(byHour[11]).toBe(false)
    expect(byHour[12]).toBe(true)
  })

  it('marks past slots as unavailable', () => {
    const slots = buildDaySlots('2026-07-08', {
      ...base,
      // 10:30 AM Manila time on the booking day
      now: new Date('2026-07-08T02:30:00Z'),
    })

    const byHour = Object.fromEntries(slots.map((slot) => [slot.hour, slot.available]))
    expect(byHour[8]).toBe(false)
    expect(byHour[10]).toBe(false)
    expect(byHour[11]).toBe(true)
  })
})
