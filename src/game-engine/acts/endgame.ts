// src/game-engine/acts/endgame.ts
// PURE fort assault and Act 4 endgame rules.
//
// Act 4's demand is computed from the player's LIVE capacity rather than a
// constant. A fixed number is either trivial for a strong player or
// unsurvivable for a weak one, and the scene only works if it is precisely,
// visibly out of reach.

export interface FortState {
  locationId: string
  /** Garrison strength, 100-400. The capital is the strongest. */
  strength: number
  isCapital: boolean
  destroyed: boolean
}

export const RAID_SKILL_REQUIRED = 60
export const CAPITAL_STRENGTH = 400
export const ACT4_DEMAND_MULTIPLIER = 2
export const DEFIANCE_COUNTDOWN_DAYS = 12
export const SUBMISSION_PATIENCE_FLOOR = 1

export type AssaultRefusal =
  | 'already-destroyed'
  | 'untrained'
  | 'too-few'
  | 'capital-locked'

export type AssaultCheck =
  | { ok: true }
  | { ok: false; reason: AssaultRefusal }

export interface AssaultForce {
  size: number
  militarySkill: number
}

/**
 * Whether an assault may be launched.
 *
 * The capital stays locked until two other forts have fallen, so the endgame
 * cannot be rushed past the war that gives it meaning.
 */
export function checkAssault(
  fort: FortState,
  force: AssaultForce,
  fortsDestroyed: number,
): AssaultCheck {
  if (fort.destroyed) return { ok: false, reason: 'already-destroyed' }
  if (force.size < 20) return { ok: false, reason: 'too-few' }
  if (force.militarySkill < RAID_SKILL_REQUIRED) return { ok: false, reason: 'untrained' }
  if (fort.isCapital && fortsDestroyed < 2) return { ok: false, reason: 'capital-locked' }
  return { ok: true }
}

export function assaultRefusalMessage(reason: AssaultRefusal): string {
  switch (reason) {
    case 'already-destroyed':
      return 'Nothing stands there now.'
    case 'untrained':
      return 'Your Fedaykin are not drilled for a fortress.'
    case 'too-few':
      return 'Too few to storm a wall.'
    case 'capital-locked':
      return 'Their capital will not fall while its outposts still stand.'
  }
}

/**
 * The Emperor's final demand.
 *
 * Twice what the player could possibly produce before the deadline — computed
 * live, so it is always exactly out of reach rather than arbitrarily cruel or
 * accidentally payable.
 */
export function impossibleDemand(
  currentStock: number,
  projectedIncome: number,
): number {
  const reachable = Math.max(0, currentStock) + Math.max(0, projectedIncome)
  // Floor keeps the demand meaningful even for a player who has nothing.
  return Math.max(500, Math.round(reachable * ACT4_DEMAND_MULTIPLIER))
}

export type FinalChoice = 'submit' | 'defy'

export interface Act4State {
  choice: FinalChoice | null
  /** Days left before the Sardaukar land. Only counts down after defiance. */
  countdown: number
}

export function makeChoice(choice: FinalChoice): Act4State {
  return {
    choice,
    countdown: choice === 'defy' ? DEFIANCE_COUNTDOWN_DAYS : 0,
  }
}

export function tickCountdown(state: Act4State): Act4State {
  if (state.choice !== 'defy' || state.countdown <= 0) return state
  return { ...state, countdown: state.countdown - 1 }
}

/**
 * Whether submission is still a survivable path.
 *
 * Submitting must not be a disguised loss — a choice that cannot win is not a
 * choice, and the player will feel it. It buys time at the cost of the
 * military win, and the ecology ending remains reachable.
 */
export function submissionSurvivable(patience: number): boolean {
  return patience >= SUBMISSION_PATIENCE_FLOOR
}

export function countdownExpired(state: Act4State): boolean {
  return state.choice === 'defy' && state.countdown <= 0
}

/** Forts destroyed so far. */
export function destroyedCount(forts: readonly FortState[]): number {
  return forts.filter(f => f.destroyed).length
}

export function capitalDestroyed(forts: readonly FortState[]): boolean {
  return forts.some(f => f.isCapital && f.destroyed)
}
