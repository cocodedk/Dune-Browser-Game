// src/game-engine/sim/sweep/metrics.ts
// Small pure statistics helpers shared by runOne.ts (per-run) and
// aggregate.ts (per-cohort) — WP04 chunk W4d. No engine or formula
// knowledge here, only arithmetic over already-collected numbers.

/** The action with the highest count, and its share of the total —
 * excludes `'idle'` (an absence of a command, not a command family) from
 * both the winner search and the denominator. Null dominant/share when
 * nothing but idle happened. */
export function dominantCommandShare(
  actionCounts: Record<string, number>,
): { dominant: string | null; share: number | null } {
  const entries = Object.entries(actionCounts).filter(([kind]) => kind !== 'idle')
  const total = entries.reduce((sum, [, n]) => sum + n, 0)
  if (total === 0) return { dominant: null, share: null }
  const [dominant, count] = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
  return { dominant, share: count / total }
}

/** Linear-interpolation-free "nearest rank" percentile — sufficient for a
 * cohort of ~100 integers/floats where the exact interpolation method does
 * not change which band a reader draws a conclusion from. `p` in [0, 100]. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))]
}

/** The most frequent value in a list of stringified tuples (used by
 * aggregate.ts to find a cohort's modal (cycle1Band, cycle2Band, ending)
 * outcome) — first-seen wins a tie, a deterministic and simple rule for a
 * report, not a statistical claim about which tie-winner is "the" mode. */
export function mode(values: string[]): string | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: string | null = null
  let bestCount = -1
  for (const v of values) {
    const c = counts.get(v)!
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN
  return values.reduce((a, b) => a + b, 0) / values.length
}
