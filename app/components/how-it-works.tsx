const STEPS = [
  {
    title: 'Check in at the desk',
    body: 'Pay the open-play rate at the front desk and our staff adds your name to the live queue.',
  },
  {
    title: 'Watch the board',
    body: 'Your spot is held in order. Track your position on the display screens or from your phone at /live.',
  },
  {
    title: 'Play your match',
    body: 'When a court opens, you and three others are called. One match per turn, 20 minutes on court.',
  },
  {
    title: 'Rematch or step out',
    body: 'Hop back in the queue for another round or call it a day. Your session covers as many rotations as you want.',
  },
]

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
      <div className="mb-14 flex flex-col gap-3">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Open play
        </p>
        <h2 className="font-heading max-w-xl text-balance text-4xl font-black tracking-tight sm:text-5xl">
          How to get playing
        </h2>
      </div>

      <ol className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex flex-col gap-4">
            {/* connecting rail on large screens */}
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-14 top-7 hidden h-px w-[calc(100%-2rem)] bg-border lg:block"
              />
            )}
            <span className="font-heading relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
              {index + 1}
            </span>
            <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
