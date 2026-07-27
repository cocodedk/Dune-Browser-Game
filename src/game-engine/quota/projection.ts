// src/game-engine/quota/projection.ts
// PURE income projection for the quota ledger.
//
// This drives the single most important number on screen: whether the player
// is on track. If it is wrong, every decision they make is made on bad
// information — so it is treated as load-bearing and tested directly against
// simulated accrual rather than eyeballed.

import { harvestYield } from '../troops/harvest'
import { effectiveDensity, extractionTier } from '../troops/types'
import type { SpiceField, TroopGroup, Equipment } from '../troops/types'

export interface ProjectionInputs {
  groups: readonly TroopGroup[]
  fields: readonly SpiceField[]
  equipment: readonly Equipment[]
  daysRemaining: number
  currentStock: number
  amountDue: number
}

export interface Projection {
  /** Spice expected to accrue before the deadline. */
  projectedIncome: number
  /** Stock plus projected income. */
  projectedTotal: number
  /** Positive means surplus, negative means shortfall. */
  surplus: number
  onTrack: boolean
  /** Per-day rate at current assignments, for a "X/day" readout. */
  dailyRate: number
}

function equipmentKindsFor(
  group: TroopGroup,
  equipment: readonly Equipment[],
): ReturnType<typeof extractionTier> {
  const kinds = equipment
    .filter(e => group.equipmentIds.includes(e.id))
    .map(e => e.kind)
  return extractionTier(kinds)
}

/**
 * Project income to the deadline.
 *
 * Deliberately accounts for field depletion day by day rather than
 * extrapolating today's rate: a crew working a nearly-empty field will not
 * keep paying today's number, and a projection that ignores that would tell
 * the player they are safe right up until they miss the quota.
 */
export function projectIncome(inputs: ProjectionInputs): Projection {
  const { groups, fields, equipment, daysRemaining, currentStock, amountDue } = inputs

  // Simulate against copies so the projection never mutates live state.
  const remainingById = new Map(fields.map(f => [f.id, f.remaining]))
  let projectedIncome = 0
  let firstDayRate = 0

  for (let day = 0; day < Math.max(0, daysRemaining); day++) {
    let dayTotal = 0

    for (const group of groups) {
      if (group.task !== 'harvest' || !group.taskTargetId) continue
      // A group still in changeover produces nothing on its remaining days.
      if (group.changeoverDaysLeft > day) continue

      const field = fields.find(f => f.id === group.taskTargetId)
      if (!field) continue

      const remaining = remainingById.get(field.id) ?? 0
      if (remaining <= 0) continue

      const density = effectiveDensity({ ...field, remaining })
      const potential = harvestYield({
        tier: equipmentKindsFor(group, equipment),
        density,
        size: group.size,
        spiceSkill: group.skills.spice,
        morale: group.morale,
      })

      const extracted = Math.min(potential, remaining)
      remainingById.set(field.id, remaining - extracted)
      dayTotal += extracted
    }

    if (day === 0) firstDayRate = dayTotal
    projectedIncome += dayTotal
  }

  const projectedTotal = currentStock + projectedIncome
  return {
    projectedIncome,
    projectedTotal,
    surplus: projectedTotal - amountDue,
    onTrack: projectedTotal >= amountDue,
    dailyRate: firstDayRate,
  }
}
