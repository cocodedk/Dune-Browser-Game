// src/game-engine/quota/settlementRefusal.ts
// PURE prose for the settle command's refusal codes — no world, no React.
// Mirrors sietch/pledgeRefusal.ts: commands/outcome.ts's contract keeps
// prose out of the command/rule functions themselves, so this is the one
// place a stable reason code becomes player-facing text.

import type { SettleRefusal } from '../commands/settleCommand'

export function settleRefusalMessage(reason: SettleRefusal): string {
  switch (reason) {
    case 'no-pending-settlement':
      return 'There is no tribute decision waiting.'
    case 'amount-negative':
      return 'The amount must be zero or more.'
    case 'amount-exceeds-available':
      return 'You do not have that much spice to send.'
  }
}
