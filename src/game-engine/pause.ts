// src/game-engine/pause.ts
// PURE pause rules, separated from the mutable clock so they can be tested
// without touching module state.
//
// Time pausing during dialogue is load-bearing for the Cryo Dune shape: most
// real playtime is reading while paused, which is how a 24 game-day slice
// fills 60-90 real minutes. Without it, conversations bleed the quota clock.

export interface PauseInputs {
  /** Explicit player pause (menu, pause button). */
  manual: boolean
  /** True while a dialogue tree is open. */
  inDialogue: boolean
  /** True once the run has ended — win or loss. */
  ended: boolean
  /**
   * True while a tribute settlement decision is pending (02-runtime-
   * consolidation.md "Tribute": "simulation pauses" at the deadline). Engine-
   * authoritative like the other reasons here — not a UI flag — so a reload
   * that restores `world.pendingSettlement` restores the freeze with it.
   */
  settlementPending: boolean
  /**
   * True until the opening's briefing closes (03-opening-experience.md
   * "Starting contract": "simulation paused for the briefing"). Callers
   * derive this as `world.lastProcessedDay === null &&
   * world.flags['briefing.complete'] !== true` (see GameLoop.ts) — NOT from
   * the flag alone.
   *
   * Keying on `lastProcessedDay` ("has any day boundary ever run in this
   * save") rather than the flag alone is what keeps an old save from before
   * this pause reason existed from freezing on load with no way out: such a
   * save necessarily already crossed a day boundary under the prior code
   * (day boundaries were never gated before this chunk), so
   * `lastProcessedDay` is already a number and this input reads false
   * regardless of the missing flag — no save-migration version bump needed.
   * The one accepted edge case is an old save taken in the first few seconds
   * of day 0, before its own first day boundary; it is rare, and recoverable
   * the same way a fresh campaign clears the gate — runtime/openingBriefing.ts's
   * trigger reopens the Duke Leto (or Thufir) tree on the next mount and the
   * player walks it to its end, same as any other fresh campaign.
   */
  briefingPending: boolean
}

/**
 * Whether the simulation clock should be frozen.
 *
 * Any one reason is enough; they do not cancel each other out. In particular a
 * manual unpause must not resume time while a dialogue is still open.
 */
export function shouldPause(inputs: PauseInputs): boolean {
  return inputs.manual || inputs.inDialogue || inputs.ended ||
    inputs.settlementPending || inputs.briefingPending
}

/**
 * Effective elapsed game time for a real-time delta.
 * Returns 0 while paused so callers need no branch of their own.
 */
export function effectiveDelta(delta: number, speed: number, paused: boolean): number {
  if (paused) return 0
  if (delta <= 0) return 0
  // Negative or zero speed would run the clock backwards or stall it silently.
  return delta * Math.max(0, speed)
}
