// src/game-engine/sietch/morale.ts
// PURE morale rules and the output multiplier every task depends on.
//
// The multiplier lives here and ONLY here. Harvest, prospect, train and
// ecology all scale by it, and a duplicated formula would drift silently until
// the economy no longer matched its own balance tests.

export const MORALE_NEUTRAL = 50
export const MORALE_DRIFT_PER_DAY = 2
export const VISIT_MORALE_GAIN = 10
export const VISIT_COOLDOWN_DAYS = 5
export const EQUIPMENT_MORALE_GAIN = 5
export const RAID_MORALE_LOSS = 15
export const QUOTA_MISS_MORALE_LOSS = 5

/** Output multiplier range: 0.4 at zero morale, 1.0 at full. */
export const MORALE_MULTIPLIER_BASE = 0.4
export const MORALE_MULTIPLIER_SLOPE = 0.006

export interface MoraleState {
  morale: number
  lastMoraleVisitDay: number
}

function clampMorale(value: number): number {
  return Math.max(0, Math.min(100, value))
}

/**
 * The single output multiplier for every troop task.
 *
 * Deliberately floored at 0.4 rather than 0: a demoralised sietch should be
 * bad, not useless. Zero output would strand a player with no way to recover,
 * since recovery requires the income the zero is denying them.
 */
export function moraleMultiplier(morale: number): number {
  const m = clampMorale(morale)
  return MORALE_MULTIPLIER_BASE + MORALE_MULTIPLIER_SLOPE * m
}

/**
 * Daily drift toward neutral.
 *
 * Both a euphoric and a miserable sietch trend back to 50, so neither a single
 * good day nor a single disaster defines the rest of the run.
 */
export function driftMorale(state: MoraleState, floor = 0): MoraleState {
  const target = Math.max(MORALE_NEUTRAL, floor)
  const current = state.morale

  if (current === target) return state

  const step = Math.min(MORALE_DRIFT_PER_DAY, Math.abs(target - current))
  const next = current < target ? current + step : current - step
  return { ...state, morale: clampMorale(Math.max(next, floor)) }
}

/** Morale gain from a player visit, subject to a cooldown. */
export function visitMorale(state: MoraleState, currentDay: number): MoraleState {
  if (currentDay - state.lastMoraleVisitDay < VISIT_COOLDOWN_DAYS) return state
  return {
    morale: clampMorale(state.morale + VISIT_MORALE_GAIN),
    lastMoraleVisitDay: currentDay,
  }
}

export function adjustMorale(state: MoraleState, delta: number): MoraleState {
  return { ...state, morale: clampMorale(state.morale + delta) }
}
