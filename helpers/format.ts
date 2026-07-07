// Global formatting helpers — reused across pages. Facility operates in PHP.

export function formatCurrency(cents: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatTime(iso: string, timezone = 'Asia/Manila'): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDate(iso: string, timezone = 'Asia/Manila'): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

// Today's date as YYYY-MM-DD in the facility timezone (for URL params).
export function todayISODate(timezone = 'Asia/Manila'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
}

export function minutesLeft(endsAtISO: string, now = new Date()): number {
  return Math.ceil((new Date(endsAtISO).getTime() - now.getTime()) / 60000)
}
