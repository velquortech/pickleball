import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { cn } from '@/lib/utils'
import { getAvailability } from '@/app/api/bookings/controller'
import { DateNav } from './components/date-nav'
import { SlotPicker } from './components/slot-picker'
import { BookingForm } from './components/booking-form'
import { parseBookSearchParams, bookUrl } from './helpers/search-params'

export const dynamic = 'force-dynamic'

const BOOKING_TYPES = [
  { value: 'private_rental', label: 'Private court' },
  { value: 'coaching', label: 'Coaching' },
] as const

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = parseBookSearchParams(await searchParams)

  // SSR reuse: calls the bookings controller directly — no HTTP round trip.
  const availability = await getAvailability({ date: params.date }).catch(() => null)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight">Book a court</h1>
          <p className="text-muted-foreground">
            Reserve a VIP court or a coaching session. Pay online and get your
            booking reference instantly.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Booking type</span>
            <div className="flex rounded-lg border border-border p-1">
              {BOOKING_TYPES.map((type) => (
                <Link
                  key={type.value}
                  href={bookUrl({ ...params, type: type.value, startsAt: undefined })}
                  replace
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm transition-colors',
                    params.type === type.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {type.label}
                </Link>
              ))}
            </div>
          </div>
          <DateNav params={params} />
        </div>

        {availability === null ? (
          <Alert>
            <AlertTitle>Online booking is temporarily unavailable</AlertTitle>
            <AlertDescription>
              Please try again in a few minutes, or message us to reserve your slot.
            </AlertDescription>
          </Alert>
        ) : availability.length === 0 ? (
          <Alert>
            <AlertTitle>No bookable courts yet</AlertTitle>
            <AlertDescription>
              VIP courts will appear here once the facility opens reservations.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
            <SlotPicker availability={availability} params={params} />
            <BookingForm params={params} />
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
