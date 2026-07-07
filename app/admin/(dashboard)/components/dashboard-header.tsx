'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { ADMIN_TABS, parseAdminTab } from '../helpers/tabs'

const SETTINGS_HEADER = {
  label: 'Settings',
  description: 'Facility hours, match rules, and booking holds.',
}

export function DashboardHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const header =
    pathname === '/admin/settings'
      ? SETTINGS_HEADER
      : ADMIN_TABS.find(
          (item) => item.value === parseAdminTab(searchParams.get('tab') ?? undefined)
        )!

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex flex-col">
        <h1 className="text-sm font-semibold leading-tight">{header.label}</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">{header.description}</p>
      </div>
    </header>
  )
}
