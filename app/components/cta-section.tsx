import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CourtIllustration } from '@/components/site/court-illustration'

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/60 px-6 py-16 shadow-[0_0_60px_-20px] shadow-primary/30 backdrop-blur-xl sm:px-14">
        <CourtIllustration className="pointer-events-none absolute -left-14 -top-20 w-64 -rotate-12 text-primary/[0.08]" />
        <CourtIllustration className="pointer-events-none absolute -bottom-24 -right-10 w-64 rotate-[24deg] text-chart-2/[0.08]" />

        <div className="relative flex flex-col items-start gap-6 sm:max-w-lg">
          <h2 className="font-heading text-balance text-4xl font-black uppercase tracking-tight sm:text-5xl">
            Book your <span className="text-primary">court.</span>
          </h2>
          <p className="text-pretty leading-7 text-muted-foreground">
            Pick a date, choose your time, and lock in a VIP court. Pay online
            and your reference code lands instantly — no calls, no waiting.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="px-7" render={<Link href="/book">Book now</Link>} />
            <Button
              size="lg"
              variant="outline"
              className="px-7"
              render={<Link href="/live">Check the queue first</Link>}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
