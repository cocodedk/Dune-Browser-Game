// src/game-engine/sim/agents/policyHelpers.ts
// Shared pure read-helpers over VisibleState, reused by more than one of the
// five WP04 chunk W4c agents. Every legality check here calls the SAME pure
// production predicate the UI panel for that action calls (checkPledge:
// PledgePanel.tsx; GIFT_SPICE_COST/GIFT_PER_VISIT_CAP: giftButtonVisibility
// .ts) — never a hand-derived reimplementation of "is this legal" (07's
// may-not list is about formulas, but the same discipline applies to rules).

import { checkPledge, GIFT_SPICE_COST, GIFT_PER_VISIT_CAP, UNPLEDGE_THRESHOLD, maxPledged } from '../../sietch/loyalty'
import { defaultSettleAmount } from '../../quota/settlement'
import { REGION_ADJACENCY } from '../../../data/regionAdjacency'
import type { VisibleState, VisibleSietch, VisibleCrew } from '../visibleState'
import type { PendingSettlement } from '../../quota/quota'
import type { AgentAction } from './types'

/**
 * BFS shortest path's first hop from `from` toward `target`, over the SAME
 * static region graph TravelSystem.ts's checkTravel gates every single hop
 * against (data/regionAdjacency.ts — authored map data, not a formula) —
 * restricted to `discovered` villages (view.discoveredVillageIds's own
 * doc): several graph-adjacent regions start undiscovered, and a shortcut
 * through one is a path `travelCheck` would refuse, not a real route.
 * Villages the opening's own fixtures already prove reachable (reserveLine
 * .ts: Arrakeen -> Hagg -> Red Wall is two hops; investLine.ts: Red Wall ->
 * Tabr is one) are not directly adjacent to Arrakeen, so every agent routes
 * a multi-region journey through this rather than issuing a direct hop.
 * Null once already at `target`, or if no discovered path exists.
 */
export function nextHopTo(from: string, target: string, discovered: readonly string[]): string | null {
  if (from === target) return null
  const known = new Set(discovered)
  const queue: string[][] = [[from]]
  const seen = new Set<string>([from])
  while (queue.length > 0) {
    const path = queue.shift()!
    const at = path[path.length - 1]
    for (const neighbor of REGION_ADJACENCY[at] ?? []) {
      if (seen.has(neighbor)) continue
      if (neighbor === target) return path.length === 1 ? neighbor : path[1]
      if (!known.has(neighbor)) continue // cannot route THROUGH an undiscovered waypoint
      seen.add(neighbor)
      queue.push([...path, neighbor])
    }
  }
  return null
}

/** A travel action toward `target`'s next hop, or null when already there,
 * unreachable, or the hop itself is currently refused (checked against the
 * SAME travelCheck DestinationList.tsx's own rows read, so a policy never
 * spends a decision point on a hop the UI would already show as disabled). */
export function travelToward(view: VisibleState, target: string): AgentAction | null {
  if (view.player.location === target) return null
  const hop = nextHopTo(view.player.location, target, view.discoveredVillageIds)
  if (!hop || !view.travelCheck(hop).ok) return null
  return { kind: 'travel', targetId: hop }
}

/** Fremen sietches only — the owner check PledgePanel/GiftPanel both gate
 * on (villageOwner !== 'fremen' refuses either panel entirely). */
export function fremenSietches(view: VisibleState): VisibleSietch[] {
  return view.sietches.filter(s => s.owner === 'fremen')
}

/** Whether `villageId` may be pledged right now — checkPledge (loyalty.ts),
 * the exact predicate PledgePanel.tsx's own `checkPledgeChain` wraps, given
 * this view's charisma and current pledge count. Also requires physical
 * presence: PledgePanel.tsx only renders `playerIsHere`, and the real
 * pledge command refuses 'not-present' otherwise — checkPledge alone
 * cannot see that (it has no location input), so this wraps it. */
export function canPledgeNow(view: VisibleState, villageId: string): boolean {
  if (view.player.location !== villageId) return false
  const s = view.sietches.find(x => x.villageId === villageId)
  if (!s || s.owner !== 'fremen') return false
  const pledgedCount = view.sietches.filter(x => x.pledgedToPlayer).length
  const check = checkPledge(
    { loyalty: s.loyalty, pledged: s.pledgedToPlayer, lastVisitedDay: 0, giftedThisVisit: s.giftedThisVisit },
    view.player.charisma,
    pledgedCount,
  )
  return check.ok
}

/** Whether a gift is both legal (present, capped) and affordable right now —
 * mirrors giftButtonVisibility.ts's own giftButtonVisible predicate. */
export function canGiftNow(view: VisibleState, villageId: string): boolean {
  const s = view.sietches.find(x => x.villageId === villageId)
  if (!s || s.owner !== 'fremen') return false
  if (view.player.location !== villageId) return false
  if (view.player.spice < GIFT_SPICE_COST) return false
  return s.giftedThisVisit < GIFT_PER_VISIT_CAP
}

/** A pledged sietch whose loyalty sits close enough to UNPLEDGE_THRESHOLD
 * that neglect could drop it below — recovery's "a threatened pledge"
 * read, capacity's own maintenance trigger. `margin` is the caller's own
 * policy threshold, not a rule constant (how "close" counts as "worth
 * acting on now" is a strategy choice, not an engine number). */
export function threatenedPledges(view: VisibleState, margin: number): VisibleSietch[] {
  return view.sietches.filter(
    s => s.pledgedToPlayer && s.loyalty < UNPLEDGE_THRESHOLD + margin,
  )
}

/** Nearest-to-pledgeable un-pledged Fremen sietch: highest loyalty among
 * candidates the player has actually DISCOVERED (view.discoveredVillageIds
 * — DestinationList.tsx's own read). Undiscovered villages can carry a
 * higher seed loyalty (e.g. the far-side roster) but are not real targets:
 * neither travelToward nor the production travel/pledge commands can reach
 * one, so ranking by raw loyalty alone would fixate a policy on a sietch it
 * can never act on. Shared by `capacity` and `reactive`, which both rank
 * expansion targets the same way. */
export function bestPledgeTarget(view: VisibleState): VisibleSietch | null {
  const candidates = view.sietches.filter(
    s => s.owner === 'fremen' && !s.pledgedToPlayer && view.discoveredVillageIds.includes(s.villageId),
  )
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (b.loyalty > a.loyalty ? b : a))
}

/** Charisma pledge capacity remaining right now (maxPledged minus the
 * sietches already pledged) — 0 means a further pledge attempt is a
 * guaranteed charisma-cap refusal. */
export function pledgeCapacityLeft(view: VisibleState): number {
  const pledgedCount = view.sietches.filter(s => s.pledgedToPlayer).length
  return Math.max(0, maxPledged(view.player.charisma) - pledgedCount)
}

/** Idle crews currently at the player's own location — the only crews an
 * assign action can legally target without traveling first
 * (EconomySystem.ts's canOrderCrewRemotely requires either presence or a
 * prescience level no opening-window fixture reaches). */
export function idleCrewsHere(view: VisibleState): VisibleCrew[] {
  return view.crews.filter(c => c.task === 'idle' && c.locationId === view.player.location)
}

/** The full-available settle amount — quota/settlement.ts's own
 * defaultSettleAmount (== legalRange.max), the Enter-key default every
 * settlement modal already offers. Re-exported here so every agent file
 * that wants "pay everything available" imports the SAME production
 * function rather than reading `.legalRange.max` five separate times. */
export function fullAvailable(pending: PendingSettlement): number {
  return defaultSettleAmount(pending)
}
