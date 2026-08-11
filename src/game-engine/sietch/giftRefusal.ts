// src/game-engine/sietch/giftRefusal.ts
// PURE prose for the gift command's refusal codes — no world, no React.
//
// Mirrors sietch/pledgeRefusal.ts: commands/outcome.ts's contract keeps
// player-facing prose out of the command/rule functions themselves, so this
// is the one place a stable reason code becomes player-facing text.
// SietchVisitSystem.giftPlayerSietch already returns a CommandOutcome; this
// is the mapping CommandWiring.ts's onGift needs to stop discarding it
// (docs/PRD/game-completion/baseline/wp02-critic-verdict.md, finding 3b).

import type { GiftRefusal } from '../SietchVisitSystem'

export function giftRefusalMessage(reason: GiftRefusal): string {
  switch (reason) {
    case 'not-present':
      return 'You must stand among them to offer a gift.'
    case 'no-sietch':
      return 'There are no Fremen here to gift.'
    case 'gift-cap-reached':
      return 'They have accepted all they will take from you this visit.'
    case 'insufficient-spice':
      return 'You do not have enough spice to offer.'
  }
}
