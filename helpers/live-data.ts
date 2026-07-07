import 'server-only'

// Reuses the API controllers directly for SSR — same logic, no HTTP hop.
import { listCourts } from '@/app/api/courts/controller'
import { listQueue } from '@/app/api/queue/controller'
import { listActiveMatches } from '@/app/api/matches/controller'

export async function getLiveData() {
  try {
    const [courts, queue, matches] = await Promise.all([
      listCourts(),
      listQueue(),
      listActiveMatches(),
    ])
    return { courts, queue, matches, online: true as const }
  } catch {
    return { courts: [], queue: [], matches: [], online: false as const }
  }
}

export type LiveData = Awaited<ReturnType<typeof getLiveData>>
