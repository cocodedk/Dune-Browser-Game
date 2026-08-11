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
  | 'finish-the-conversation'

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
  /**
   * True while a mandatory dialogue is open — DialogueSystem.ts's
   * canCloseDialogue()/dialogueIsCloseable() is false. Optional so every
   * existing caller/test that predates this field keeps compiling with the
   * old "no mandatory beat can possibly be open" assumption; TravelSystem.ts
   * always supplies it explicitly on the live path.
   */
  mandatoryDialogueOpen?: boolean
}

/**
 * Full validity check for a travel command.
 *
 * Order matters: cheaper and more specific rejections come first so the reason
 * reported back to the player is the most useful one. A mandatory dialogue
 * comes first of all — W3i remediation: the blind-play re-check's softlock
 * was travel starting while a mandatory beat (e.g. Thufir's ledger) was still
 * open, which the UI alone could not reliably prevent (a replayed bus event,
 * a stale panel). Nothing else the player could legally be doing matters
 * until that conversation ends.
 */
export function checkTravel(ctx: TravelContext): TravelCheck {
  const { from, to, mode, isTraveling, adjacency, mandatoryDialogueOpen } = ctx

  if (mandatoryDialogueOpen) return { ok: false, reason: 'finish-the-conversation' }
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
    case 'finish-the-conversation':
      // W3i: the destination rows render this verbatim (DestinationList.tsx)
      // while a mandatory beat is open — the player must resolve it before
      // travel is legal again, not merely be told a click "did nothing".
      return 'Finish this conversation before you travel.'
  }
}
