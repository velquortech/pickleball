import 'server-only'

import { createClient } from '@/config/supabase/server'
import type { Rate } from '@/config/supabase/models'

// Landing must render even when the local Supabase stack is down, so rates
// fall back to the seeded defaults.
const FALLBACK_RATES: Pick<Rate, 'id' | 'rate_type' | 'name' | 'description' | 'price_cents' | 'currency' | 'unit'>[] = [
  {
    id: 'fallback-open-play',
    rate_type: 'open_play',
    name: 'Open Play',
    description: 'Walk in, join the queue, and rotate through 20-minute matches all session long.',
    price_cents: 20000,
    currency: 'PHP',
    unit: 'per head',
  },
  {
    id: 'fallback-private',
    rate_type: 'private_rental',
    name: 'Private Court',
    description: 'Reserve a VIP court for your own group — up to 4 players included.',
    price_cents: 60000,
    currency: 'PHP',
    unit: 'per hour',
  },
  {
    id: 'fallback-coaching',
    rate_type: 'coaching',
    name: 'Coaching Session',
    description: 'One-on-one or small group coaching with a certified instructor on a VIP court.',
    price_cents: 90000,
    currency: 'PHP',
    unit: 'per hour',
  },
]

export async function getRates() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('rates')
      .select('id, rate_type, name, description, price_cents, currency, unit')
      .eq('is_active', true)
      .order('sort_order')

    if (data && data.length > 0) return data
  } catch {
    // fall through to defaults
  }
  return FALLBACK_RATES
}
