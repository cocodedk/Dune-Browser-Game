// src/game-engine/troops/assignCrewRefusal.ts
// PURE prose for the assign-crew command's refusal codes — no world, no
// React. Mirrors sietch/pledgeRefusal.ts: the shared codes (too-small,
// no-target, target-undiscovered, target-exhausted, already-assigned,
// needs-thopter) delegate to assign.ts's own assignRefusalMessage so that
// wording is not duplicated here; only the command-layer codes (crew not
// found, crew wiped out, too far to hear an order) get new text.

import { assignRefusalMessage, type AssignRefusal } from './assign'
import type { AssignCrewRefusal } from '../commands/assignCrewCommand'

export function assignCrewRefusalMessage(reason: AssignCrewRefusal): string {
  switch (reason) {
    case 'unknown-crew':
      return 'That crew no longer exists.'
    case 'crew-destroyed':
      return 'That crew has been wiped out.'
    case 'too-far':
      return 'They are too far to hear you.'
    default:
      return assignRefusalMessage(reason as AssignRefusal)
  }
}
