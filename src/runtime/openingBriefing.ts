// src/runtime/openingBriefing.ts
// The opening's auto-open trigger (chunk W3c — 03-opening-experience.md
// "Teaching sequence" Beat 1: "The first conversation must show a finished
// character presentation..."; "Starting contract": "Day 0, morning
// presentation; simulation paused for the briefing"). Decided:
// auto-open-once, not a Show-action the player has to find first — the
// briefing is meant to be the natural first thing that happens, not an
// optional discovery.
//
// Called every frame from runtime/GameDriver.ts's tick(), the same shape as
// q1Debrief.ts's own hook (W3i remediation) — NOT from ThreeContainer's
// one-time mount effect, which is what this module used to document here.
// That mount-only call worked for the FIRST campaign of a session but never
// re-fired for a fresh campaign started mid-session with no remount
// (StatusBar's New button, `window.confirm` path): `newGame()` swaps in a
// brand-new WorldState via `setWorld()`, and this module's live import
// binding of `world` (below) picks that up immediately, but nothing was
// calling this function again to notice. The per-frame call already runs
// AFTER wireCommands() has registered 'player:choose' for the same reason
// the old mount-effect ordering did — GameDriver.tick() is only ever invoked
// from inside the requestAnimationFrame loop ThreeContainer starts after its
// own wireCommands() call, so the ordering guarantee carries over unchanged.
// Renderer-agnostic like CommandWiring.ts/VisitPolicy.ts (no three.js
// import), which is why it lives in runtime/ rather than game-engine/
// despite mutating world state the way TravelSystem.startTravel already
// does.

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
 * idempotent across every OTHER frame once a beat has opened (a second
 * ThreeContainer mount after Continue; React StrictMode's dev double-invoke;
 * simply the next tick) — it is only ever a no-op past the first successful
 * call, since either a beat's own dialogue is already open or both flags are
 * already true. Being called every frame rather than once is what makes this
 * self-healing for ANY path into a fresh campaign, not just the one that
 * happened to trigger a mount: every guard here reads live `world` state, so
 * a brand-new WorldState object (`setWorld()` — title's New Campaign,
 * StatusBar's mid-session New, or a future path) re-arms them from scratch
 * with no extra wiring at the call site. This is also the self-healing path
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
