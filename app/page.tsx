import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { Hero } from './components/hero'
import { AboutSection } from './components/about-section'
import { ActivitiesSection } from './components/activities-section'
import { RatesSection } from './components/rates-section'
import { HowItWorks } from './components/how-it-works'
import { FaqSection } from './components/faq-section'
import { CtaSection } from './components/cta-section'
import { getRates } from './helpers/get-rates'
import { getLiveData } from '@/helpers/live-data'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [rates, live] = await Promise.all([getRates(), getLiveData()])

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero live={live} />
        <AboutSection />
        <ActivitiesSection />
        <HowItWorks />
        <RatesSection rates={rates} />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  )
}
