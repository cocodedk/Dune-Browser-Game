// src/game-render/modes/strategic/markerLayout.ts
// PURE mapping from engine village coordinates to world-space marker
// positions. Split out from the three.js layer so the projection is testable —
// a silent off-by-one here puts every sietch in the wrong place.

/** The engine's village positions are in the old 800x500 Phaser canvas space. */
export const SOURCE_WIDTH = 800
export const SOURCE_HEIGHT = 500

export interface MarkerPlacement {
  id: string
  x: number
  z: number
}

export interface SourcePoint {
  id: string
  position: { x: number; y: number }
}

/**
 * Project canvas coordinates onto the terrain plane, centred on the origin.
 *
 * `spread` is the world extent the canvas maps onto — deliberately smaller
 * than the full terrain so markers sit in the readable middle of the map
 * rather than out in the fogged distance.
 */
export function projectToWorld(
  point: { x: number; y: number },
  spread: number,
): { x: number; z: number } {
  const u = point.x / SOURCE_WIDTH - 0.5
  const v = point.y / SOURCE_HEIGHT - 0.5
  return { x: u * spread, z: v * spread }
}

export function layoutMarkers(points: SourcePoint[], spread: number): MarkerPlacement[] {
  return points.map(p => {
    const { x, z } = projectToWorld(p.position, spread)
    return { id: p.id, x, z }
  })
}

/** Inverse projection — used to turn a terrain raycast hit back into canvas space. */
export function worldToSource(
  x: number,
  z: number,
  spread: number,
): { x: number; y: number } {
  return {
    x: (x / spread + 0.5) * SOURCE_WIDTH,
    y: (z / spread + 0.5) * SOURCE_HEIGHT,
  }
}

/**
 * Nearest placement to a world position, or null when nothing is within
 * `maxDistance`. Clicking empty sand must deselect rather than snap to a
 * far-off sietch.
 */
export function nearestMarker(
  placements: MarkerPlacement[],
  x: number,
  z: number,
  maxDistance: number,
): MarkerPlacement | null {
  let best: MarkerPlacement | null = null
  let bestSq = maxDistance * maxDistance

  for (const p of placements) {
    const dx = p.x - x
    const dz = p.z - z
    const distSq = dx * dx + dz * dz
    if (distSq <= bestSq) {
      bestSq = distSq
      best = p
    }
  }
  return best
}
