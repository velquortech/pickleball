import 'server-only'

// Reuses the API controllers directly for SSR — same logic, no HTTP hop.
import { listCourts } from '@/app/api/courts/controller'
import { listQueue } from '@/app/api/queue/controller'
import { listActiveMatches, listFormingRosters } from '@/app/api/matches/controller'

export async function getLiveData() {
  try {
    // `forming` rosters hold their courts without a running clock — the board
    // shows them as filling up, never as free.
    const [courts, queue, matches, forming] = await Promise.all([
      listCourts(),
      listQueue(),
      listActiveMatches(),
      listFormingRosters(),
    ])
    return { courts, queue, matches, forming, online: true as const }
  } catch {
    return { courts: [], queue: [], matches: [], forming: [], online: false as const }
  }
}

export type LiveData = Awaited<ReturnType<typeof getLiveData>>
