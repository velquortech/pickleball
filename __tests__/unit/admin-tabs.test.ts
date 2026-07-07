import { ADMIN_TABS, parseAdminTab } from '@/app/admin/(dashboard)/helpers/tabs'

describe('parseAdminTab', () => {
  it('accepts every declared tab', () => {
    for (const tab of ADMIN_TABS) {
      expect(parseAdminTab(tab.value)).toBe(tab.value)
    }
  })

  it('falls back to queue for unknown, missing, or array values', () => {
    expect(parseAdminTab('payroll')).toBe('queue')
    expect(parseAdminTab(undefined)).toBe('queue')
    expect(parseAdminTab(['courts'])).toBe('queue')
  })
})
