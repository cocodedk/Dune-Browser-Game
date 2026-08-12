// src/game-engine/acts/assaultCommandRefusal.ts
// PURE prose for the assault-fort command's refusal codes — no world, no
// React. The four fort-content codes delegate to endgame.ts's own
// assaultRefusalMessage; only the command-layer 'unknown-fort' gets new text.

import { assaultRefusalMessage, type AssaultRefusal } from './endgame'
import type { AssaultCommandRefusal } from '../commands/assaultCommand'

export function assaultCommandRefusalMessage(reason: AssaultCommandRefusal): string {
  if (reason === 'unknown-fort') return 'There is no fort there.'
  return assaultRefusalMessage(reason as AssaultRefusal)
}
