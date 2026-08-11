// src/runtime/openingBriefing.ts
// The opening's auto-open trigger (chunk W3c — 03-opening-experience.md
// "Teaching sequence" Beat 1: "The first conversation must show a finished
// character presentation..."; "Starting contract": "Day 0, morning
// presentation; simulation paused for the briefing"). Decided:
// auto-open-once, not a Show-action the player has to find first — the
// briefing is meant to be the natural first thing that happens, not an
// optional discovery.
//
// Called from ThreeContainer.tsx's mount effect, AFTER wireCommands() has
// registered 'player:choose' — not from ui/store.ts's newGame(), where it
// would race the lazy-loaded renderer chunk. DialoguePanel renders
// unconditionally once `screen === 'game'` (App.tsx), so calling this any
// earlier risks the panel showing Duke Leto's first reply buttons before
// anything is listening for a click on them — a dead button, worse than a
// missing one. Renderer-agnostic like CommandWiring.ts/VisitPolicy.ts
// (no three.js import), which is why it lives in runtime/ rather than
// game-engine/ despite mutating world state the way TravelSystem.startTravel
// already does.

import { world } from '../game-engine/GameState'
import { startDialogue } from '../game-engine/DialogueSystem'
import { BRIEFING_TREE_ID, LEDGER_TREE_ID } from '../data/dialogue'
import { BRIEFING_COMPLETE_FLAG, LEDGER_READ_FLAG } from '../game-engine/acts/openingObjectives'

/**
 * Opens whichever of the two opening beats is still outstanding, if any.
 *
 * Guarded on `lastProcessedDay === null` — the exact "no day boundary has
 * ever run" sentinel pause.ts's own briefingPending gate uses, so this fires
 * in precisely the window the campaign clock is frozen for it and never for
 * an ordinary mid-campaign save. `dialogue === null` additionally makes this
 * idempotent across a remount (React StrictMode's dev double-invoke; a
 * second ThreeContainer mount after Continue) — it is only ever a no-op past
 * the first successful call, since either a beat's own dialogue is already
 * open or both flags are already true. This is also the self-healing path
 * for a save that somehow reloaded with no dialogue open mid-chain (Beat 1
 * done, Beat 2 not): the ledger reopens rather than leaving the campaign
 * frozen with nothing on screen.
 */
export function maybeOpenOpeningDialogue(): void {
  if (world.player.location !== 'arrakeen') return
  if (world.lastProcessedDay !== null) return
  if (world.dialogue !== null) return

  if (world.flags[BRIEFING_COMPLETE_FLAG] !== true) {
    startDialogue(BRIEFING_TREE_ID, 'arrakeen')
  } else if (world.flags[LEDGER_READ_FLAG] !== true) {
    startDialogue(LEDGER_TREE_ID, 'arrakeen')
  }
}
