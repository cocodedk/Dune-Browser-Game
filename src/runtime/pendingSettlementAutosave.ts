// src/runtime/pendingSettlementAutosave.ts
// Recovery row (f)'s travel/settlement half (03-opening-experience.md:
// "Closes during travel or settlement | Autosave restores the same travel
// or pending-decision state without duplication"). Mirrors runtime/
// q1Debrief.ts's exact shape: EconomySystem.ts's runTributeCheck (pure
// `world` mutation) sets a flag the instant it creates a new pending
// settlement; this hook, called every frame from GameDriver.tick(), reads
// the flag, fires the existing rolling autosave, and consumes the flag
// before the async save even starts — so a remount mid-frame, or the save
// itself taking a moment, can never fire it twice for the same decision.
//
// Living in runtime/ (not game-engine/) is what keeps saveGame's IndexedDB
// call out of the engine tree: every engine-level fixture that calls
// runTributeCheck/dayRunner directly (never touching this hook's own call
// site) writes the flag and stops there — same reasoning as q1Debrief.ts's
// own header for Q1_DEBRIEF_PENDING_FLAG.

import { world } from '../game-engine/GameState'
import { SETTLEMENT_PENDING_AUTOSAVE_FLAG } from '../game-engine/quota/settlement'
import { saveGame } from '../game-engine/persistence'

/**
 * Fire-and-forget rolling save the moment a pending settlement is created.
 * `.catch` mirrors commandHandlers.ts's onSettle autosave and main.tsx's own
 * load — this wiring layer must never block a frame on IndexedDB I/O.
 */
export function maybeAutosavePendingSettlement(): void {
  if (world.flags[SETTLEMENT_PENDING_AUTOSAVE_FLAG] !== true) return

  world.flags[SETTLEMENT_PENDING_AUTOSAVE_FLAG] = false
  void saveGame(world).catch(() => {})
}
