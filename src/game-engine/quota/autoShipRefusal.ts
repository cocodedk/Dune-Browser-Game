// src/game-engine/quota/autoShipRefusal.ts
// PURE prose for the auto-ship command's refusal code — no world, no React.
//
// Mirrors quota/settlementRefusal.ts and sietch/pledgeRefusal.ts. Minor by
// the audit's own reading (finding 3c): QuotaLedger.tsx only renders the
// auto-ship control once AUTO_SHIP_UNLOCKED_FLAG is set, so this refusal is
// unreachable through production UI today — but CommandWiring.ts must still
// not discard it, matching "no silent rejection" for every other command.

import type { AutoShipRefusal } from '../commands/autoShipCommand'

export function autoShipRefusalMessage(reason: AutoShipRefusal): string {
  switch (reason) {
    case 'auto-ship-locked':
      return 'Automatic shipment unlocks after your first tribute is settled.'
  }
}
