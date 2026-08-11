// src/game-engine/sim/advance.ts
// Time advancement for the headless runner — through the production update
// path only (07-balance-playtest-and-release.md "Runtime-faithful
// simulator": "Advance to the next decision or a bounded number of days").
// Every function here calls runtimeTick.ts's shared sequence — the same one
// GameDriver.tick() runs — never GameLoop.update() alone and never a raw
// `world.time` write of its own. (game-render/core/debugSources.ts's own
// `setTime: seconds => { world.time = seconds }` is the production
// precedent that a direct write is a legitimate debug/scrub operation, not a
// rule; this module still prefers ticking BY an exact delta over jumping TO
// a raw value, so dayRunner.ts's own crossedDays() bookkeeping never has to
// resync from behind.)

import { world } from '../GameState'
import { DAY_SECONDS, currentDay } from '../TimeSystem'
import { runtimeTick } from '../../runtime/runtimeTick'
import { hashState } from '../state/hash'
import type { HashStep } from './trace'

/** Whether the engine is in a state that would ignore a further tick
 * (dialogue open, a decision pending, or the run over) — see pause.ts's
 * own `shouldPause` inputs, mirrored here read-only for a caller that wants
 * to stop advancing rather than spend a no-op tick. */
export function isBlocked(): boolean {
  return world.dialogue !== null || world.pendingSettlement !== null || world.ending !== null
}

/**
 * Tick the engine forward by exactly `seconds` of game time (0 is legal and
 * deliberate: the runner's own campaign-creation step calls this with 0 to
 * fire the opening's auto-open hook — runtimeTick.ts's hooks run every
 * frame regardless of whether the clock itself moved, the same as the
 * browser's first mount frame). Negative input clamps to 0 rather than
 * running the clock backward.
 */
export function advanceSeconds(seconds: number): void {
  runtimeTick(Math.max(0, seconds))
}

/**
 * Advance until the player's current trip completes, or return immediately
 * if not traveling. One exact tick sized to the remaining travel time —
 * headless, so unlike e2e/helpers.ts's `advanceUntilArrived` (which nudges a
 * live browser clock in slices to win a real-time race) there is no race to
 * guard against: `arrivalTime - world.time` is exact and provably positive
 * whenever `state === 'traveling'` (TravelSystem.ts's startTravel always
 * sets arrivalTime strictly after the current `world.time`).
 */
export function advanceUntilArrival(): void {
  if (world.player.state !== 'traveling') return
  advanceSeconds(world.player.arrivalTime - world.time)
}

/**
 * Advance one calendar day at a time, from the day after whatever has
 * already processed up to (and including) `day`, recording a hashState()
 * snapshot after every processed day — the per-day granularity W4b's parity
 * protocol needs ("Compare state hashes after every command and processed
 * day"). Stops early if a day's processing opens a dialogue, creates a
 * pending settlement, or ends the run — the same conditions
 * {@link isBlocked} reports — since a further tick would be a no-op behind
 * pause.ts's own gate, not genuine advancement.
 */
export function advanceToDay(day: number, hashLog: HashStep[]): void {
  while (currentDay() < day && !isBlocked()) {
    const nextDayStart = (currentDay() + 1) * DAY_SECONDS
    advanceSeconds(nextDayStart - world.time)
    hashLog.push({ kind: 'day', ref: currentDay(), hash: hashState(world) })
  }
}
