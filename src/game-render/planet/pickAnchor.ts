// src/game-render/planet/pickAnchor.ts
// PURE: which settlement a point on the globe belongs to.

import type { Vector3 } from 'three'

/**
 * Nearest anchor to a point, or null when nothing is close enough.
 *
 * @param maxDistance World units. Clicking bare sand must select nothing
 *   rather than snapping to whichever sietch happens to be least far away.
 */
export function nearestAnchor(
  point: Vector3,
  anchors: ReadonlyMap<string, Vector3>,
  maxDistance: number,
): string | null {
  let best: string | null = null
  let bestDistance = maxDistance

  for (const [id, anchor] of anchors) {
    const d = anchor.distanceTo(point)
    if (d >= bestDistance) continue
    best = id
    bestDistance = d
  }
  return best
}
