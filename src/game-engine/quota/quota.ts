// src/game-engine/quota/quota.ts
// PURE quota rules — the dominant clock.
//
// Without this the game is a sandbox with no reason to act; with it, every
// assignment decision has a deadline behind it. The pressure has to be real
// but survivable: the design promise is that from patience 1, full
// mobilisation can always buy two more cycles. game-engine/sim/runner.ts
// (07-balance-playtest-and-release.md's runtime-faithful simulator, WP04)
// is what asserts that end to end now — balance/simulate.ts, the parallel-
// economy model this citation used to name, was deleted at chunk W4a
// (progress.md Round 16: closes WP02's C5 carve-out and the 15-vs-28
// crew-size divergence — see data/troopGroups.ts's own citation). The
// recovery-fixture proof of THIS specific invariant is still owed to a
// later WP04 chunk (Round 16's own reading); these tests pin the mechanics
// it will rely on.

export const CYCLE_DAYS = 8
/**
 * The first tribute falls later than the rest — the Emperor grants a
 * settling-in period.
 *
 * This exists to solve a measured defect, not for flavour. At an 8-day first
 * deadline the player never held 100 spice with headroom, so the harvester
 * was unbuyable and the capex decision the slice is built around never
 * occurred. A 12-day grace opens exactly one window in which investing is a
 * real gamble against the first demand.
 */
export const FIRST_DEADLINE_DAY = 12
export const STARTING_PATIENCE = 3
export const MAX_PATIENCE = 3
export const PARTIAL_PAYMENT_FRACTION = 0.6
export const ARREARS_SURCHARGE = 0.25

/**
 * First three cycles are hand-authored; later ones scale geometrically.
 *
 * Retuned from 100/250/450 after balance/simulate.ts's parallel-economy
 * harness (deleted at WP04 chunk W4a — game-engine/sim/runner.ts is its
 * runtime-faithful successor, per 07-balance-playtest-and-release.md)
 * showed that curve was unpayable: Act 1 yields ~470 spice including the
 * starting 60, against 800 demanded. Worse, it left no window in which the
 * 100-spice harvester was affordable, so the capex decision the whole slice
 * is built around never actually occurred.
 *
 * 90/150/260 totals 500 against ~530 available to a good line — tight enough
 * that a wasted cycle hurts, loose enough that the harvester window opens
 * around day 12-14 as the design intended. The numbers are unchanged by the
 * harness's retirement — this is a citation update, not a balance retune.
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

/**
 * One pending tribute decision, created at a due deadline and cleared by the
 * settle command (docs/PRD/game-completion/02-runtime-consolidation.md
 * "Tribute"). Snapshotted at creation so a paused, reloaded campaign shows
 * the exact same numbers the deadline first presented — see
 * quota/settlement.ts's buildPendingSettlement.
 */
export interface PendingSettlement {
  /** quota.cycleIndex at creation — which cycle this decision resolves. */
  cycleIndex: number
  /** quota.nextDueDay at creation. */
  dueDay: number
  /** quota.amount + quota.arrears at creation. */
  amountDue: number
  /** player.spice at creation. */
  stock: number
  /** amountDue * PARTIAL_PAYMENT_FRACTION — the full/partial payment boundary. */
  minPartialPayment: number
  /** ARREARS_SURCHARGE — the rate applied to a shortfall carried as arrears. */
  arrearsSurchargeRate: number
  /** Legal settle amounts: 0 through whichever of amountDue/stock is smaller. */
  legalRange: { min: number; max: number }
}

export function createQuotaState(difficultyMultiplier = 1): QuotaState {
  return {
    nextDueDay: FIRST_DEADLINE_DAY,
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
