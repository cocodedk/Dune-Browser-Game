// src/game-engine/troops/equipmentRefusal.ts
// PURE prose for the issue-equipment command's refusal codes — no world, no
// React. Mirrors sietch/pledgeRefusal.ts: commands/outcome.ts's contract
// keeps prose out of the check functions themselves.

import type { IssueRefusal } from './equipment'

export function issueRefusalMessage(reason: IssueRefusal): string {
  switch (reason) {
    case 'unknown-equipment':
      return 'That equipment no longer exists.'
    case 'already-issued':
      return 'That equipment is already with a crew.'
    case 'no-target':
      return 'Choose which crew gets it.'
    case 'unknown-crew':
      return 'That crew no longer exists.'
    case 'crew-destroyed':
      return 'There is no one left in that crew to carry it.'
  }
}
