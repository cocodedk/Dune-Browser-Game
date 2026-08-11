// src/runtime/runtimeTick.ts
// The exact per-tick sequence GameDriver.ts runs on the engine, extracted so
// game-engine/sim/runner.ts (WP04 chunk W4a) can call the identical
// sequence headlessly. Before this split, GameDriver.tick() was the only
// caller of the three runtime auto-open hooks below; a headless runner that
// advanced the clock through GameLoop.update() alone, without also calling
// them, would freeze on the opening's briefing gate exactly like the fixed
// mid-session-New bug (runtime/openingBriefing.ts's own doc) — the briefing
// never auto-opens, pause.ts's briefingPending gate never clears, and the
// clock never moves. One shared function is what makes that drift
// structurally impossible instead of merely documented.

import { update as engineUpdate } from '../game-engine/GameLoop'
import { maybeOpenOpeningDialogue } from './openingBriefing'
import { maybeOpenQ1Debrief } from './q1Debrief'
import { maybeAutosavePendingSettlement } from './pendingSettlementAutosave'

/**
 * Advance the engine by `deltaSeconds` of game time, then run every runtime
 * auto-open/autosave hook a fresh frame must check — regardless of whether
 * the clock actually moved, since a dialogue or settlement pause still needs
 * its own hook to fire (a paused engine update is exactly when the briefing
 * or debrief tree is waiting to open). GameDriver.tick() and
 * game-engine/sim/runner.ts both call this, and only this, for their engine
 * step — see either caller's own doc for why a second, hand-copied hook list
 * would drift.
 */
export function runtimeTick(deltaSeconds: number): void {
  engineUpdate(deltaSeconds)
  maybeOpenOpeningDialogue()
  maybeOpenQ1Debrief()
  maybeAutosavePendingSettlement()
}
