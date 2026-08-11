// src/game-engine/travel/rules.ts
// PURE travel rules: what the player may travel to, and how long it takes.
//
// These are engine rules, not UI hints. The UI hides invalid targets, but the
// engine must reject them too — otherwise a stale panel, a replayed bus event,
// or a loaded save can teleport the player somewhere they never discovered.

export type TravelMode = 'foot' | 'thopter' | 'lr_thopter'

export interface TravelNode {
  id: string
  position: { x: number; y: number }
  regionId: string
  discovered: boolean
}

export type TravelRejection =
  | 'same-location'
  | 'already-traveling'
  | 'unknown-location'
  | 'undiscovered'
  | 'out-of-range'

export type TravelCheck =
  | { ok: true; durationSeconds: number }
  | { ok: false; reason: TravelRejection }

/** World units per game-second, by mode. */
const SPEED: Record<TravelMode, number> = {
  foot: 50,
  thopter: 150,
  lr_thopter: 150,
}

const MIN_DURATION = 4

export function travelDurationFor(
  from: TravelNode,
  to: TravelNode,
  mode: TravelMode,
): number {
  const dx = to.position.x - from.position.x
  const dy = to.position.y - from.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return Math.max(MIN_DURATION, Math.round(distance / SPEED[mode]))
}

/**
 * Whether two regions are adjacent.
 *
 * Adjacency is supplied as a map rather than derived from geometry so the
 * designer controls the map's connectivity — Arrakis is not a Voronoi diagram.
 * A region is always adjacent to itself.
 */
export function regionsAdjacent(
  a: string,
  b: string,
  adjacency: Readonly<Record<string, readonly string[]>>,
): boolean {
  if (a === b) return true
  return (adjacency[a] ?? []).includes(b)
}

export interface TravelContext {
  from: TravelNode | undefined
  to: TravelNode | undefined
  mode: TravelMode
  isTraveling: boolean
  adjacency: Readonly<Record<string, readonly string[]>>
}

/**
 * Full validity check for a travel command.
 *
 * Order matters: cheaper and more specific rejections come first so the reason
 * reported back to the player is the most useful one.
 */
export function checkTravel(ctx: TravelContext): TravelCheck {
  const { from, to, mode, isTraveling, adjacency } = ctx

  if (isTraveling) return { ok: false, reason: 'already-traveling' }
  if (!from || !to) return { ok: false, reason: 'unknown-location' }
  if (from.id === to.id) return { ok: false, reason: 'same-location' }
  if (!to.discovered) return { ok: false, reason: 'undiscovered' }

  // A long-range thopter ignores the region-range limit entirely; that is the
  // whole point of buying one.
  if (mode !== 'lr_thopter' && !regionsAdjacent(from.regionId, to.regionId, adjacency)) {
    return { ok: false, reason: 'out-of-range' }
  }

  return { ok: true, durationSeconds: travelDurationFor(from, to, mode) }
}

/** Player-facing explanation for a rejection. */
export function rejectionMessage(reason: TravelRejection): string {
  switch (reason) {
    case 'same-location':
      return 'You are already here.'
    case 'already-traveling':
      return 'You are already under way.'
    case 'unknown-location':
      return 'No such place is known to you.'
    case 'undiscovered':
      return 'You know of no route there. Send a crew to prospect.'
    case 'out-of-range':
      // W3h: the old copy ("Too far without a long-range ornithopter")
      // read as an equipment gate, but the real rule is region adjacency
      // on foot (checkTravel above) — a first-timer could read it as
      // "buy a vehicle" when the actual fix is a closer waypoint. Names
      // the real rule and both remedies instead.
      return 'Out of walking range from here — travel through a closer place first, ' +
        'or wait for a long-range ornithopter to go directly.'
  }
}
