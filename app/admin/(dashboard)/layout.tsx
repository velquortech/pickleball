import { redirect } from 'next/navigation'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createClient } from '@/config/supabase/server'
import { AppSidebar } from './components/app-sidebar'
import { DashboardHeader } from './components/dashboard-header'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hard server-side check on top of the proxy redirect (S3).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/admin/login')

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar userEmail={user.email ?? 'staff'} />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex-1 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
