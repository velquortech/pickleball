import { getFacilitySettings } from '@/app/api/settings/controller'
import { SettingsForm } from './components/settings-form'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await getFacilitySettings()

  return <SettingsForm settings={settings} />
}
