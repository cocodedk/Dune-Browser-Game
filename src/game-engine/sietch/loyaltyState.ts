// src/game-engine/sietch/loyaltyState.ts
// Adapts SietchState's field names to sietch/loyalty.ts's LoyaltyState —
// chunk W2b (docs/PRD/game-completion/02-runtime-consolidation.md "Sietches
// and loyalty"), which asks the pledge chain to adapt "the LoyaltyState.
// pledged naming mismatch" rather than rename either side.
//
// SietchState calls the fact "pledgedToPlayer" — the vocabulary every other
// engine module (SietchSystem, the EventBus commands) already shares.
// (CombatSystem used to share it too, before its combat-pledge path died in
// W2b and the file itself was deleted in W2e — legacy-authority-inventory.md
// category 4.) loyalty.ts's pure rule module calls the exact same fact "pledged",
// its own self-contained vocabulary, checked against nothing else. Two names
// for one boolean; every live loyalty writer goes through these two pure
// functions instead of re-deriving the mapping at each call site.

import type { SietchState } from './types'
import type { LoyaltyState } from './loyalty'

/** Read a sietch's loyalty-relevant fields as a LoyaltyState. */
export function readLoyaltyState(sietch: SietchState): LoyaltyState {
  return {
    loyalty: sietch.loyalty ?? 0,
    pledged: sietch.pledgedToPlayer,
    lastVisitedDay: sietch.lastVisitedDay ?? 0,
    giftedThisVisit: sietch.giftedThisVisit ?? 0,
  }
}

/**
 * Fold a LoyaltyState back onto a SietchState, preserving every other field
 * (fremenWorkers, morale, crewIds, ...).
 */
export function writeLoyaltyState(sietch: SietchState, state: LoyaltyState): SietchState {
  return {
    ...sietch,
    pledgedToPlayer: state.pledged,
    loyalty: state.loyalty,
    lastVisitedDay: state.lastVisitedDay,
    giftedThisVisit: state.giftedThisVisit,
  }
}
