// src/ui/giftButtonVisibility.ts
// The gift button's visibility rule, pulled out of GiftPanel.tsx as a plain
// function so it is unit-testable under this repo's DOM-free vitest setup
// (vite.config.ts: environment 'node', no jsdom/testing-library, and the
// test glob only matches *.test.ts — a rendered-component test is not the
// established style here). CommandWiring.ts's onGift still re-validates
// presence/cap/spice independently on dispatch (docs/PRD/game-completion/
// 02-runtime-consolidation.md: "Every mutating command validates its
// current preconditions even if the UI disabled the control") — this
// predicate only decides when offering the button is *useful*, not whether
// the command is *safe*.

import type { SietchState } from '../game-engine/sietch/types'
import { GIFT_SPICE_COST, GIFT_PER_VISIT_CAP } from '../game-engine/sietch/loyalty'

export interface GiftButtonState {
  villageOwner: string
  sietch: SietchState | null
  playerIsHere: boolean
  playerSpice: number
}

/**
 * Visible at a Fremen sietch, while present, when a gift is both affordable
 * (enough spice for one GIFT_SPICE_COST) and allowed (this visit's budget —
 * sietch/loyalty.ts's GIFT_PER_VISIT_CAP — is not yet exhausted). Does NOT
 * gate on `pledgedToPlayer`, unlike PledgePanel: a gift stays useful after a
 * sietch is pledged too, as ongoing loyalty maintenance against the neglect
 * decay that can unpledge it (loyalty.ts's UNPLEDGE_THRESHOLD).
 */
export function giftButtonVisible(state: GiftButtonState): boolean {
  if (!state.playerIsHere) return false
  if (state.villageOwner !== 'fremen') return false
  if (!state.sietch) return false
  if (state.playerSpice < GIFT_SPICE_COST) return false
  if ((state.sietch.giftedThisVisit ?? 0) >= GIFT_PER_VISIT_CAP) return false
  return true
}
