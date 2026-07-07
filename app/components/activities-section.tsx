import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

const ACTIVITIES = [
  {
    image: '/images/open-play.svg',
    alt: 'Two crossed pickleball paddles with a ball',
    title: 'Open play sessions',
    body: 'Drop-in play every day for all skill levels. Show up, join the queue, get matched with whoever is on the board, and keep rotating as long as you like.',
  },
  {
    image: '/images/events.svg',
    alt: 'Pennant banners over a pickleball ball',
    title: 'Socials & events',
    body: 'Ladder nights, themed socials, and community mixers. Something is going on at the District every week — watch the board at the front desk.',
  },
  {
    image: '/images/coaching.svg',
    alt: 'Paddle serving a ball toward a target',
    title: 'Coaching & clinics',
    body: 'Book a certified coach on a VIP court for one-on-one or small-group sessions. Beginners clinics run regularly so nobody starts from zero alone.',
  },
]

export function ActivitiesSection() {
  return (
    <section id="activities" className="scroll-mt-20 border-y border-border bg-muted/50">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
        <div className="mb-12 flex flex-col gap-3">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
            What&apos;s on
          </p>
          <h2 className="font-heading max-w-xl text-balance text-4xl font-black tracking-tight sm:text-5xl">
            Courts, events, and a queue that works.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {ACTIVITIES.map((activity) => (
            <Card
              key={activity.title}
              className="group gap-0 overflow-hidden py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={activity.image}
                  alt={activity.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <CardContent className="flex flex-col gap-3 p-6">
                <h3 className="font-heading text-xl font-semibold">{activity.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{activity.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
