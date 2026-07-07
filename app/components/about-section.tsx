import Image from 'next/image'

const STATS = [
  { value: '6', label: 'indoor courts' },
  { value: '20', label: 'minutes per match' },
  { value: '4', label: 'players called per court' },
]

export function AboutSection() {
  return (
    <section id="club" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
            The club
          </p>
          <h2 className="font-heading max-w-lg text-balance text-4xl font-black tracking-tight sm:text-5xl">
            Iloilo needed a proper pickleball home. So we built one.
          </h2>
          <div className="flex max-w-lg flex-col gap-4 text-base leading-7 text-muted-foreground">
            <p>
              What started as pickup games on borrowed basketball courts turned
              into six dedicated indoor courts with proper surfaces, proper
              nets, and a queue system that actually works.
            </p>
            <p>
              No court-hogging, no guessing when you&apos;re up. Your name goes
              on the board, the display calls you when a court opens, and
              everyone rotates through — beginners and 4.5s alike.
            </p>
          </div>

          <dl className="mt-2 grid grid-cols-3 gap-6 border-t border-border pt-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dd className="font-heading text-4xl font-bold text-primary">{stat.value}</dd>
                <dt className="mt-1 text-sm text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Collage: court + queue board, with a floating accent chip */}
        <div className="relative mx-auto w-full max-w-lg">
          <div className="grid grid-cols-[1.25fr_1fr] items-stretch gap-4">
            <Image
              src="/images/court-day.svg"
              alt="Top-down view of a pickleball court mid-match"
              width={800}
              height={500}
              className="h-full rounded-2xl border border-border object-cover shadow-lg"
            />
            <div className="flex flex-col gap-4">
              <Image
                src="/images/queue-board.svg"
                alt="The live queue display board"
                width={800}
                height={500}
                className="rounded-2xl border border-border object-cover shadow-lg"
              />
              <div className="flex flex-1 flex-col justify-center gap-1 rounded-2xl bg-primary p-5 text-primary-foreground glow-primary">
                <p className="font-heading text-2xl font-black uppercase tracking-tight">
                  Next up: you.
                </p>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary-foreground/70">
                  Queue runs itself
                </p>
              </div>
            </div>
          </div>
          <span className="font-heading absolute -left-3 -top-4 rotate-[-4deg] rounded-full bg-primary px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-md glow-primary">
            20-min rotations
          </span>
        </div>
      </div>
    </section>
  )
}
