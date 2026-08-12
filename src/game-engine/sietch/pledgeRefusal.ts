// src/game-engine/sietch/pledgeRefusal.ts
// PURE prose for the pledge chain's refusal codes — no world, no React.
//
// commands/outcome.ts's contract: "No player-facing prose in pure rule
// functions; UI/event policy maps stable reason codes to text." Kept out of
// SietchSystem.ts (which reads `world` to check the chain) so this module
// stays importable — and mockable in isolation — without pulling in engine
// state, matching travel/rules.ts's rejectionMessage alongside checkTravel.

import { pledgeRefusalMessage } from './loyalty'
import type { PledgeRefusal } from '../SietchSystem'

/**
 * Player-facing text for every refusal the five-step pledge chain can
 * report. The three loyalty-owned codes (already-pledged, not-loyal-enough,
 * charisma-cap) delegate to loyalty.ts's own pledgeRefusalMessage, so the
 * wording authored there is not duplicated here.
 */
export function pledgeChainRefusalMessage(reason: PledgeRefusal): string {
  switch (reason) {
    case 'not-present':
      return 'You must stand among them to pledge their loyalty.'
    case 'no-sietch':
      return 'There are no Fremen here to pledge.'
    case 'not-fremen':
      return 'This is not Fremen soil to pledge.'
    case 'already-pledged':
    case 'not-loyal-enough':
    case 'charisma-cap':
      return pledgeRefusalMessage(reason)
  }
}
