import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CourtIllustration } from '@/components/site/court-illustration'
import type { LiveData } from '@/helpers/live-data'

function LiveBoard({ courts, queue, matches, online }: LiveData) {
  const playable = courts.filter((court) => court.status === 'open')
  const waiting = queue.filter((entry) => entry.status === 'waiting')
  const playersOnCourt = matches.reduce(
    (total, match) => total + match.match_players.length,
    0
  )

  return (
    <div className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-card/60 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Live at the District
        </p>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      </div>

      {online ? (
        <>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div>
              <dd className="font-mono text-4xl font-bold tabular-nums text-foreground">
                {matches.length}
                <span className="text-lg text-muted-foreground">/{playable.length}</span>
              </dd>
              <dt className="mt-1 text-xs text-muted-foreground">courts in play</dt>
            </div>
            <div>
              <dd className="font-mono text-4xl font-bold tabular-nums">{playersOnCourt}</dd>
              <dt className="mt-1 text-xs text-muted-foreground">on court</dt>
            </div>
            <div>
              <dd className="font-mono text-4xl font-bold tabular-nums text-primary">
                {waiting.length}
              </dd>
              <dt className="mt-1 text-xs text-muted-foreground">in queue</dt>
            </div>
          </dl>

          {waiting.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Up next
              </p>
              <ol className="flex flex-col gap-1.5 text-sm">
                {waiting.slice(0, 4).map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-primary">
                      {String(entry.position).padStart(2, '0')}
                    </span>
                    <span className="truncate text-foreground/85">
                      {entry.player.display_name}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          Court status appears here while the facility is online. Drop by any
          day between 8:00 AM and 10:00 PM.
        </p>
      )}

      <Link
        href="/live"
        className="mt-5 block font-mono text-xs font-bold uppercase tracking-[0.08em] text-primary underline-offset-4 hover:underline"
      >
        Full court display →
      </Link>
    </div>
  )
}

const TICKER_ITEMS = [
  'All levels welcome',
  '6 indoor courts',
  '20-minute rotations',
  'Open daily 8AM – 10PM',
  'Walk-ins welcome',
  'VIP courts for private rent',
]

function HeroTicker() {
  return (
    <div className="relative border-t border-border bg-card/40">
      <div className="flex overflow-hidden py-3.5">
        <ul className="flex w-max shrink-0 animate-[marquee_45s_linear_infinite] items-center motion-reduce:animate-none">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <li
              key={index}
              className="flex items-center gap-3 whitespace-nowrap pr-10 font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Hero({ live }: { live: LiveData }) {
  return (
    <section className="relative overflow-hidden">
      {/* faint oversized court behind everything */}
      <CourtIllustration className="pointer-events-none absolute -right-24 top-1/2 hidden w-[26rem] -translate-y-1/2 rotate-[18deg] text-primary/[0.07] lg:block" />
      <div
        aria-hidden
        className="absolute inset-0 text-foreground opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* neon glow bleeding in from the corners */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 left-[-10%] h-[24rem] w-[24rem] rounded-full bg-chart-2/10 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[7fr_5fr]">
        <div className="flex flex-col items-start gap-7">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Iloilo City · 6 indoor courts
          </p>

          <h1 className="font-heading max-w-xl text-balance text-5xl font-black uppercase leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
            Six courts.
            <br />
            One queue.
            <br />
            <span className="text-primary">Everybody plays.</span>
          </h1>

          <p className="max-w-lg text-pretty text-lg leading-8 text-muted-foreground">
            Dink District is Iloilo&apos;s indoor pickleball home. Walk in and
            rotate through 20-minute open-play matches, or book a VIP court for
            your own crew. All levels, all welcome.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="px-7" render={<Link href="/book">Book a Court</Link>} />
            <Button
              size="lg"
              variant="outline"
              className="px-7"
              render={<Link href="/live">See who&apos;s playing →</Link>}
            />
          </div>

          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground/80">
            Open daily 8:00 AM – 10:00 PM · Mandurriao, Iloilo City
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <LiveBoard {...live} />
        </div>
      </div>

      <HeroTicker />
    </section>
  )
}
