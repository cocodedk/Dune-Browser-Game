// src/runtime/q1Debrief.ts
// Beat 7's post-settlement debrief auto-open (03-opening-experience.md
// "Teaching sequence" Beat 7 — mirrors runtime/openingBriefing.ts's own
// pattern: settleCommand.ts sets a flag; this hook, called every frame from
// GameDriver.tick(), reads it and opens the tree). Living in runtime/ rather
// than game-engine/ (unlike Beats 4/6's TravelSystem.ts triggers) is what
// keeps every engine-level fixture that calls runSettleCommand directly
// (settleCommand.fixtures.test.ts, settleCommand.playability.test.ts) from
// ever running this — those tests import from game-engine/ only, never from
// runtime/, so the flag settleCommand.ts writes sits inert for them exactly
// as quota/settlement.ts's own doc says it should.

import { world } from '../game-engine/GameState'
import { startDialogue } from '../game-engine/DialogueSystem'
import {
  Q1_DEBRIEF_PENDING_FLAG, Q1_DEBRIEF_BAND_FLAG, Q1_DEBRIEF_NEARLY_FULL_FLAG, decodeSettlementBand,
} from '../game-engine/quota/settlement'
import { Q1_DEBRIEF_TREE_ID, q1DebriefRootId } from '../data/dialogue'

/**
 * Opens the Fenring/Thufir debrief once, right after the first settlement
 * (Q1) resolves. Guarded on `world.dialogue === null` (never interrupts an
 * open conversation) and `world.ending === null` (cheap insurance against
 * opening a dialogue over GoalOverlay, though patience 3 at Q1 makes an
 * ending here unreachable in practice). Consumes the pending flag before
 * calling startDialogue, not after, so a remount mid-frame cannot reopen it.
 */
export function maybeOpenQ1Debrief(): void {
  if (world.ending !== null) return
  if (world.dialogue !== null) return
  if (world.flags[Q1_DEBRIEF_PENDING_FLAG] !== true) return

  const code = typeof world.flags[Q1_DEBRIEF_BAND_FLAG] === 'number'
    ? (world.flags[Q1_DEBRIEF_BAND_FLAG] as number) : 2
  const nearlyFull = world.flags[Q1_DEBRIEF_NEARLY_FULL_FLAG] === true
  world.flags[Q1_DEBRIEF_PENDING_FLAG] = false
  startDialogue(
    Q1_DEBRIEF_TREE_ID,
    world.player.location,
    q1DebriefRootId(decodeSettlementBand(code), nearlyFull),
  )
}
