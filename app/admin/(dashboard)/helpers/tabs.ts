import { ListOrdered, Swords, LayoutGrid, CalendarCheck, type LucideIcon } from 'lucide-react'

export type AdminTab = 'queue' | 'matches' | 'courts' | 'bookings'

export const ADMIN_TABS: {
  value: AdminTab
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: 'queue',
    label: 'Queue',
    description: 'Add walk-ins and fill open courts from the line.',
    icon: ListOrdered,
  },
  {
    value: 'matches',
    label: 'Matches',
    description: 'Matches in play — end them and rotate the next group in.',
    icon: Swords,
  },
  {
    value: 'courts',
    label: 'Courts',
    description: 'Add courts, set maintenance status, or retire them.',
    icon: LayoutGrid,
  },
  {
    value: 'bookings',
    label: 'Bookings',
    description: 'Private rentals and coaching reservations.',
    icon: CalendarCheck,
  },
]

export function parseAdminTab(value: string | string[] | undefined): AdminTab {
  return ADMIN_TABS.some((tab) => tab.value === value) ? (value as AdminTab) : 'queue'
}
