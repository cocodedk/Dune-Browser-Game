// src/runtime/visitRefusal.ts
// Player-facing prose for a VisitRefusal code.
//
// Same split the rest of the codebase uses (sietch/pledgeRefusal.ts,
// quota/autoShipRefusal.ts, travel/rules.ts's rejectionMessage): the decider
// returns a stable code, this layer turns it into words. 02-runtime-
// consolidation.md's command contract — "no player-facing prose in pure rule
// functions; UI/event policy maps stable reason codes to text."

import type { VisitRefusal } from './VisitPolicy'

export function visitRefusalMessage(reason: VisitRefusal): string {
  switch (reason) {
    case 'in-dialogue':
      // Deliberately the same shape as travel's own refusal, because it is
      // the same situation seen from a different control.
      return 'Finish this conversation first.'
    case 'traveling':
      return 'You are under way — arrive before you speak to anyone.'
    case 'not-here':
      return 'They are not here.'
    case 'unknown-person':
      return 'No such person is known to you.'
    case 'unknown-place':
      return 'No such place is known to you.'
  }
}
