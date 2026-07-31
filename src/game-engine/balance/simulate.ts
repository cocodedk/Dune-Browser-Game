// src/game-engine/balance/simulate.ts
// PURE headless economy simulation.
//
// A 4-6 hour game cannot be balanced by playing it repeatedly, so most tuning
// has to be simulation. This models the Act 1 economy day by day over the pure
// rules — no renderer, no module state — so a full run costs microseconds and
// the design's invariants can be asserted rather than hoped for.

import { harvestYield } from '../troops/harvest'
import { effectiveDensity } from '../troops/types'
import type { SpiceField, ExtractionTier } from '../troops/types'
import { settleQuota, createQuotaState, isDue, totalDue } from '../quota/quota'
import type { QuotaState } from '../quota/quota'
import { moraleMultiplier } from '../sietch/morale'

export type Strategy =
  | 'optimal'        // buy the harvester as soon as affordable
  | 'greedy-harvest' // never invest, harvest everything
  | 'hoarder'        // bank spice, never spend
  | 'naive'          // one crew, never expands or invests

export interface SimCrew {
  size: number
  spiceSkill: number
  morale: number
  tier: ExtractionTier
}

export interface SimResult {
  strategy: Strategy
  daysRun: number
  cyclesSettled: number
  finalPatience: number
  totalEarned: number
  totalPaid: number
  survived: boolean
  /** Patience at the end of each cycle, for spotting a slow death. */
  patienceTrace: number[]
}

const HARVESTER_PRICE = 100
/** A pledge roughly every five days is a brisk but achievable Act 1 pace. */
const PLEDGE_INTERVAL_DAYS = 5
const MAX_CREWS = 6

function crewYield(crew: SimCrew, field: SpiceField): number {
  return harvestYield({
    tier: crew.tier,
    density: effectiveDensity(field),
    size: crew.size,
    spiceSkill: crew.spiceSkill,
    morale: crew.morale,
  })
}

/**
 * Run one strategy for a number of days.
 *
 * Deliberately models only the spice-to-quota spine. Combat, ecology and
 * prescience are excluded: this harness answers "can the player pay?", which is
 * the question every other system is balanced around.
 */
export function simulate(
  strategy: Strategy,
  days: number,
  difficultyMultiplier = 1,
): SimResult {
  let quota: QuotaState = createQuotaState(difficultyMultiplier)
  let stock = 60 // starting spice
  let totalEarned = 0
  let totalPaid = 0
  let cyclesSettled = 0
  let survived = true
  const patienceTrace: number[] = []

  const crews: SimCrew[] =
    strategy === 'naive'
      ? [{ size: 30, spiceSkill: 30, morale: 55, tier: 'hand' }]
      : [
          { size: 30, spiceSkill: 30, morale: 60, tier: 'hand' },
          { size: 30, spiceSkill: 30, morale: 55, tier: 'hand' },
        ]

  const fields: SpiceField[] = [
    { id: 'a', regionId: 'r', position: { x: 0, y: 0 }, discovered: true, density: 45, capacity: 360, remaining: 360 },
    { id: 'b', regionId: 'r', position: { x: 0, y: 0 }, discovered: true, density: 55, capacity: 440, remaining: 440 },
  ]

  for (let day = 1; day <= days; day++) {
    // Production.
    crews.forEach((crew, i) => {
      const field = fields[Math.min(i, fields.length - 1)]
      if (field.remaining <= 0) return
      const extracted = Math.min(crewYield(crew, field), field.remaining)
      field.remaining -= extracted
      stock += extracted
      totalEarned += extracted
      // Skill grows by doing, capped as the design specifies.
      crew.spiceSkill = Math.min(70, crew.spiceSkill + 1)
    })

    // Expansion. Pledging a sietch is the primary income lever — far more
    // than equipment — and a fixed crew count made Act 1 arithmetically
    // unpayable, which is a property of the model, not the game.
    if (strategy !== 'naive' && day % PLEDGE_INTERVAL_DAYS === 0 && crews.length < MAX_CREWS) {
      crews.push({ size: 28, spiceSkill: 30, morale: 55, tier: 'hand' })
      fields.push({
        id: `f${crews.length}`, regionId: 'r', position: { x: 0, y: 0 },
        discovered: true, density: 50, capacity: 400, remaining: 400,
      })
    }

    // Investment.
    if (strategy === 'optimal' || strategy === 'greedy-harvest') {
      const upgradeable = crews.find(c => c.tier === 'hand')
      // A real player buys when the payback (6-11 days) fits before the
      // deadline, not when they can cover the whole next demand in cash.
      // The first heuristic held a 50% buffer, which is never satisfiable
      // and made 'optimal' behave identically to hoarding.
      const daysToDue = quota.nextDueDay - day
      const safeToSpend = strategy === 'greedy-harvest' || daysToDue >= 4
      if (upgradeable && safeToSpend && stock >= HARVESTER_PRICE) {
        stock -= HARVESTER_PRICE
        upgradeable.tier = 'harvester'
      }
    }

    // Settlement.
    if (isDue(quota, day)) {
      const due = totalDue(quota)
      const paid = Math.min(stock, due)
      const outcome = settleQuota(quota, paid, difficultyMultiplier)
      stock -= outcome.paid
      totalPaid += outcome.paid
      quota = outcome.quota
      cyclesSettled += 1
      patienceTrace.push(quota.patience)

      if (outcome.gameOver) {
        survived = false
        return {
          strategy, daysRun: day, cyclesSettled,
          finalPatience: quota.patience, totalEarned, totalPaid,
          survived, patienceTrace,
        }
      }
    }
  }

  return {
    strategy, daysRun: days, cyclesSettled,
    finalPatience: quota.patience, totalEarned, totalPaid,
    survived, patienceTrace,
  }
}

/** Peak sustainable daily income, for sizing the Act 4 demand. */
export function theoreticalDailyMax(crews: readonly SimCrew[], density: number): number {
  return crews.reduce(
    (sum, crew) =>
      sum +
      harvestYield({
        tier: 'heavy_harvester',
        density,
        size: crew.size,
        spiceSkill: 100,
        morale: 100,
      }),
    0,
  )
}

/** Sanity helper: the morale multiplier bounds every yield in the game. */
export function yieldBounds(): { min: number; max: number } {
  return { min: moraleMultiplier(0), max: moraleMultiplier(100) }
}
