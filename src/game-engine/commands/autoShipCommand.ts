// src/game-engine/commands/autoShipCommand.ts
// The auto-shipment opt-in command — docs/PRD/game-completion/
// 02-runtime-consolidation.md "Tribute": "Auto-shipment is unavailable
// before the first settlement tutorial. Once unlocked, it is opt-in and
// stored in the save." Storage is world.flags (see quota/settlement.ts),
// same mechanism quota cycle/patience/arrears already use, so it survives
// serialization with no schema change.

import { world } from '../GameState'
import { ok, fail, type CommandOutcome } from './outcome'
import {
  AUTO_SHIP_UNLOCKED_FLAG, AUTO_SHIP_ENABLED_FLAG, AUTO_SHIP_AMOUNT_FLAG,
} from '../quota/settlement'

export type AutoShipCommandCode = 'auto-ship-configured'
export type AutoShipRefusal = 'auto-ship-locked'

/**
 * Toggle auto-shipment on/off, and optionally set the configured amount.
 * Refuses until the first settlement (any band) has ever completed —
 * `AUTO_SHIP_UNLOCKED_FLAG` is set once by economy/settlementRun.ts's
 * applySettlement, never by this command.
 */
export function runSetAutoShipCommand(
  enabled: boolean,
  amount?: number,
): CommandOutcome<AutoShipCommandCode, AutoShipRefusal> {
  if (world.flags[AUTO_SHIP_UNLOCKED_FLAG] !== 1) return fail('auto-ship-locked')

  world.flags[AUTO_SHIP_ENABLED_FLAG] = enabled ? 1 : 0
  if (amount !== undefined && Number.isFinite(amount) && amount >= 0) {
    world.flags[AUTO_SHIP_AMOUNT_FLAG] = amount
  }

  return ok('auto-ship-configured')
}
