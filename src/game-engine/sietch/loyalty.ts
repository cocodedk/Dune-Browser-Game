// src/game-engine/sietch/loyalty.ts
// PURE loyalty rules. Pledging is something the player earns through visits,
// gifts and dialogue — not a single free click.
//
// Loyalty is deliberately reversible in both directions: a neglected sietch
// unpledges, and an unpledged sietch can be won back. A one-way ratchet in
// either direction kills the middle game.

export const PLEDGE_THRESHOLD = 60
export const UNPLEDGE_THRESHOLD = 30
export const GIFT_SPICE_COST = 20
export const GIFT_LOYALTY_GAIN = 8
export const GIFT_PER_VISIT_CAP = 24
export const NEGLECT_DAYS = 10
export const NEGLECT_DECAY_PER_DAY = 1

export interface LoyaltyState {
  loyalty: number
  pledged: boolean
  lastVisitedDay: number
  giftedThisVisit: number
}

export type PledgeRefusal = 'not-loyal-enough' | 'charisma-cap' | 'already-pledged'

export type PledgeCheck =
  | { ok: true }
  | { ok: false; reason: PledgeRefusal }

function clampLoyalty(value: number): number {
  return Math.max(0, Math.min(100, value))
}

/**
 * Renown gained per deed.
 *
 * `world.charisma` was written by nothing at all: it started at 20 and stayed
 * there. The act2 -> act3 transition gates on charisma >= 50, so acts 3 and 4
 * — the forts, the endgame and every act-based ending — were unreachable in
 * normal play. Renown now comes from the three things that visibly grow a
 * house: sietches sworn, tribute met, raids beaten.
 */
export const CHARISMA_PER_PLEDGE = 5
export const CHARISMA_PER_QUOTA = 5
export const CHARISMA_PER_RAID = 5

/** How many sietches the player may hold at a given charisma. */
export function maxPledged(charisma: number): number {
  return Math.floor(Math.max(0, charisma) / 10)
}

/**
 * Whether a pledge may be accepted.
 *
 * Each refusal is distinct so the UI can say *why*. "Nothing happened" is the
 * worst possible feedback for the single most important action in Act 1.
 */
export function checkPledge(
  state: LoyaltyState,
  charisma: number,
  currentlyPledged: number,
): PledgeCheck {
  if (state.pledged) return { ok: false, reason: 'already-pledged' }
  if (state.loyalty < PLEDGE_THRESHOLD) return { ok: false, reason: 'not-loyal-enough' }
  if (currentlyPledged >= maxPledged(charisma)) return { ok: false, reason: 'charisma-cap' }
  return { ok: true }
}

export function pledgeRefusalMessage(reason: PledgeRefusal): string {
  switch (reason) {
    case 'not-loyal-enough':
      return 'They do not trust you enough yet.'
    case 'charisma-cap':
      return 'Your name does not carry far enough to hold another sietch.'
    case 'already-pledged':
      return 'They have already pledged to you.'
  }
}

export interface GiftResult {
  state: LoyaltyState
  spiceSpent: number
  loyaltyGained: number
  accepted: boolean
}

/**
 * Offer spice for loyalty.
 *
 * Capped per visit so the player cannot simply buy a sietch outright the
 * moment they can afford it — they have to come back, which is what makes
 * travel time a real cost.
 */
export function giveGift(state: LoyaltyState, availableSpice: number): GiftResult {
  const remainingCap = GIFT_PER_VISIT_CAP - state.giftedThisVisit
  if (remainingCap <= 0 || availableSpice < GIFT_SPICE_COST) {
    return { state, spiceSpent: 0, loyaltyGained: 0, accepted: false }
  }

  const gain = Math.min(GIFT_LOYALTY_GAIN, remainingCap)
  return {
    state: {
      ...state,
      loyalty: clampLoyalty(state.loyalty + gain),
      giftedThisVisit: state.giftedThisVisit + gain,
    },
    spiceSpent: GIFT_SPICE_COST,
    loyaltyGained: gain,
    accepted: true,
  }
}

/** Reset the per-visit gift budget. Called on arrival, not on departure. */
export function onArrival(state: LoyaltyState, currentDay: number): LoyaltyState {
  return { ...state, lastVisitedDay: currentDay, giftedThisVisit: 0 }
}

export interface DecayResult {
  state: LoyaltyState
  unpledged: boolean
}

/**
 * Daily loyalty drift for a neglected sietch.
 *
 * Dropping below the unpledge threshold releases the sietch but leaves its
 * loyalty intact, so the player can win it back rather than losing it forever.
 */
export function decayLoyalty(
  state: LoyaltyState,
  currentDay: number,
  decayMultiplier: number,
): DecayResult {
  const daysSinceVisit = currentDay - state.lastVisitedDay
  if (daysSinceVisit < NEGLECT_DAYS) return { state, unpledged: false }

  const loyalty = clampLoyalty(
    state.loyalty - NEGLECT_DECAY_PER_DAY * Math.max(0, decayMultiplier),
  )
  const unpledged = state.pledged && loyalty < UNPLEDGE_THRESHOLD

  return {
    state: { ...state, loyalty, pledged: unpledged ? false : state.pledged },
    unpledged,
  }
}

/** Apply a dialogue-driven loyalty change. */
export function adjustLoyalty(state: LoyaltyState, delta: number): LoyaltyState {
  return { ...state, loyalty: clampLoyalty(state.loyalty + delta) }
}
