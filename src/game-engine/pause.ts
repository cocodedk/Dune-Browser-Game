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
}

/**
 * Whether the simulation clock should be frozen.
 *
 * Any one reason is enough; they do not cancel each other out. In particular a
 * manual unpause must not resume time while a dialogue is still open.
 */
export function shouldPause(inputs: PauseInputs): boolean {
  return inputs.manual || inputs.inDialogue || inputs.ended
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
