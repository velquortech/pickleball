// Pure "how packed is it?" math for the live dashboard — unit-testable.

export type OccupancyLevel = 'quiet' | 'steady' | 'busy' | 'packed'

export function occupancyLevel(
  courtsInUse: number,
  totalCourts: number,
  waitingCount: number
): OccupancyLevel {
  if (totalCourts === 0) return 'quiet'

  const utilization = courtsInUse / totalCourts
  if (utilization >= 1 && waitingCount >= 8) return 'packed'
  if (utilization >= 1 || waitingCount >= 4) return 'busy'
  if (utilization >= 0.5) return 'steady'
  return 'quiet'
}

export const OCCUPANCY_COPY: Record<OccupancyLevel, string> = {
  quiet: 'Plenty of open courts — come on down!',
  steady: 'A good session going — courts still available.',
  busy: 'Getting lively — expect a short wait.',
  packed: 'Full house! Expect a wait before you get on court.',
}
