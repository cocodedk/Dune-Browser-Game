// src/game-engine/quota/quota.ts
// PURE quota rules — the dominant clock.
//
// Without this the game is a sandbox with no reason to act; with it, every
// assignment decision has a deadline behind it. The pressure has to be real
// but survivable: the design promise is that from patience 1, full
// mobilisation can always buy two more cycles. Stage 21's balance harness
// asserts that end to end; these tests pin the mechanics it relies on.

export const CYCLE_DAYS = 8
export const STARTING_PATIENCE = 3
export const MAX_PATIENCE = 3
export const PARTIAL_PAYMENT_FRACTION = 0.6
export const ARREARS_SURCHARGE = 0.25

/**
 * First three cycles are hand-authored; later ones scale geometrically.
 *
 * Retuned from 100/250/450 after the balance harness showed that curve was
 * unpayable: Act 1 yields ~470 spice including the starting 60, against 800
 * demanded. Worse, it left no window in which the 100-spice harvester was
 * affordable, so the capex decision the whole slice is built around never
 * actually occurred.
 *
 * 90/150/260 totals 500 against ~530 available to a good line — tight enough
 * that a wasted cycle hurts, loose enough that the harvester window opens
 * around day 12-14 as the design intended.
 */
export const BASE_AMOUNTS = [90, 150, 260] as const
export const LATER_CYCLE_GROWTH = 1.5

export interface QuotaState {
  nextDueDay: number
  amount: number
  cycleIndex: number
  patience: number
  arrears: number
  /** Patience may only be restored once per act. */
  restoredThisAct: boolean
}

export type PaymentBand = 'full' | 'partial' | 'short'

export interface PaymentOutcome {
  band: PaymentBand
  quota: QuotaState
  /** True when the Emperor's patience has run out — a loss state. */
  gameOver: boolean
  paid: number
  shortfall: number
}

export function createQuotaState(difficultyMultiplier = 1): QuotaState {
  return {
    nextDueDay: CYCLE_DAYS,
    amount: Math.round(BASE_AMOUNTS[0] * difficultyMultiplier),
    cycleIndex: 0,
    patience: STARTING_PATIENCE,
    arrears: 0,
    restoredThisAct: false,
  }
}

/** Base demand for a cycle, before arrears and difficulty. */
export function baseAmountForCycle(cycleIndex: number): number {
  if (cycleIndex < BASE_AMOUNTS.length) return BASE_AMOUNTS[cycleIndex]
  const stepsBeyond = cycleIndex - (BASE_AMOUNTS.length - 1)
  const last = BASE_AMOUNTS[BASE_AMOUNTS.length - 1]
  return Math.round(last * Math.pow(LATER_CYCLE_GROWTH, stepsBeyond))
}

/** Total owed this cycle: the demand plus any carried arrears. */
export function totalDue(quota: QuotaState): number {
  return quota.amount + quota.arrears
}

function classify(paid: number, due: number): PaymentBand {
  if (due <= 0) return 'full'
  if (paid >= due) return 'full'
  return paid >= due * PARTIAL_PAYMENT_FRACTION ? 'partial' : 'short'
}

/**
 * Settle a due date.
 *
 *   full     -> patience restored by 1 (max once per act), arrears cleared
 *   >= 60%   -> patience held, shortfall carried at +25%
 *   < 60%    -> patience lost, full shortfall carried
 *
 * The once-per-act restriction matters: without it a single strong cycle
 * refills patience permanently and the player never feels pressure again.
 */
export function settleQuota(
  quota: QuotaState,
  paid: number,
  difficultyMultiplier = 1,
): PaymentOutcome {
  const due = totalDue(quota)
  const actuallyPaid = Math.max(0, Math.min(paid, due))
  const band = classify(actuallyPaid, due)
  const shortfall = Math.max(0, due - actuallyPaid)

  let patience = quota.patience
  let restoredThisAct = quota.restoredThisAct
  let arrears = 0

  if (band === 'full') {
    if (patience < MAX_PATIENCE && !restoredThisAct) {
      patience += 1
      restoredThisAct = true
    }
  } else if (band === 'partial') {
    arrears = Math.round(shortfall * (1 + ARREARS_SURCHARGE))
  } else {
    patience -= 1
    arrears = shortfall
  }

  const nextCycle = quota.cycleIndex + 1
  return {
    band,
    paid: actuallyPaid,
    shortfall,
    gameOver: patience <= 0,
    quota: {
      nextDueDay: quota.nextDueDay + CYCLE_DAYS,
      amount: Math.round(baseAmountForCycle(nextCycle) * difficultyMultiplier),
      cycleIndex: nextCycle,
      patience: Math.max(0, patience),
      arrears,
      restoredThisAct,
    },
  }
}

/** Clear the once-per-act restoration allowance. Called on act transition. */
export function onActTransition(quota: QuotaState): QuotaState {
  return { ...quota, restoredThisAct: false }
}

export function isDue(quota: QuotaState, currentDay: number): boolean {
  return currentDay >= quota.nextDueDay
}

export function daysRemaining(quota: QuotaState, currentDay: number): number {
  return Math.max(0, quota.nextDueDay - currentDay)
}
