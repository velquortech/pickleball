'use client'

import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { todayISODate } from '@/helpers/format'
import { bookUrl, type BookSearchParams } from '../helpers/search-params'

export function DateNav({ params }: { params: BookSearchParams }) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="booking-date">Date</Label>
      <Input
        id="booking-date"
        type="date"
        className="w-fit"
        value={params.date}
        min={todayISODate()}
        onChange={(event) => {
          if (!event.target.value) return
          router.replace(
            bookUrl({ ...params, date: event.target.value, startsAt: undefined })
          )
        }}
      />
    </div>
  )
}
