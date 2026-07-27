// src/game-engine/EconomySystem.ts
// Day-boundary economy: harvest accrual and quota settlement.
//
// The pure rules live in troops/ and quota/; this module is the thin mutation
// layer that applies them to `world`, in the same shape as the other *System
// files. Keeping it thin is what lets the rules stay testable.

import { world } from './GameState'
import { pushEvent } from './EventSystem'
import { currentDay } from './TimeSystem'
import { getDifficultyConfig } from './difficulty'
import { harvestDay } from './troops/harvest'
import { extractionTier } from './troops/types'
import type { EquipmentKind, TroopTask } from './troops/types'
import { settleQuota, isDue, totalDue } from './quota/quota'
import { checkAssign, applyAssign, assignRefusalMessage } from './troops/assign'

/** Equipment kinds a group is carrying. */
function carriedKinds(groupId: string): EquipmentKind[] {
  return world.equipment
    .filter(e => e.groupId === groupId)
    .map(e => e.kind)
}

/**
 * Run one day of harvesting for every assigned crew.
 * Spice accrues continuously to the player's stock — the shipment event is
 * kept as the player-facing notification.
 */
export function runHarvestDay(): void {
  let dayTotal = 0

  for (const group of world.troopGroups) {
    if (group.task !== 'harvest' || !group.taskTargetId) continue

    const fieldIndex = world.spiceFields.findIndex(f => f.id === group.taskTargetId)
    if (fieldIndex < 0) continue

    const tier = extractionTier(carriedKinds(group.id))
    const { extracted, field } = harvestDay(group, world.spiceFields[fieldIndex], tier)

    if (extracted > 0) {
      world.spiceFields[fieldIndex] = field
      dayTotal += extracted
    }

    // A worked-out field releases its crew rather than silently idling them,
    // so the player is told to reassign instead of quietly earning nothing.
    if (field.remaining <= 0 && group.taskTargetId === field.id) {
      group.task = 'idle'
      group.taskTargetId = null
      pushEvent('spice_shipment_received', `The sand at ${field.id} is spent. Your crew awaits orders.`)
    }
  }

  // Changeover ticks down after production, so the day a crew is reassigned
  // genuinely costs them a day.
  for (const group of world.troopGroups) {
    if (group.changeoverDaysLeft > 0) group.changeoverDaysLeft -= 1
  }

  if (dayTotal > 0) {
    const scaled = dayTotal * getDifficultyConfig(world.difficulty).playerSpiceMultiplier
    world.player.spice += scaled
    pushEvent('spice_shipment_received', `Crews deliver ${scaled.toFixed(1)} spice`)
  }
}

/**
 * Settle the Emperor's demand if it has come due.
 *
 * Payment is automatic from stock: the player's decision is what they produced
 * before the deadline, not whether they remember to click a button on it.
 */
export function runQuotaCheck(): void {
  if (!isDue(world.quota, currentDay())) return

  const due = totalDue(world.quota)
  const paid = Math.min(world.player.spice, due)
  const config = getDifficultyConfig(world.difficulty)

  const outcome = settleQuota(world.quota, paid, config.quotaMultiplier)
  world.player.spice -= outcome.paid
  world.quota = outcome.quota

  world.flags['quota.cycle'] = outcome.quota.cycleIndex
  world.flags['quota.patience'] = outcome.quota.patience
  world.flags['quota.arrears'] = outcome.quota.arrears

  if (outcome.band === 'full') {
    pushEvent('tribute_refused', `Tribute paid in full: ${outcome.paid.toFixed(0)} spice.`)
  } else if (outcome.band === 'partial') {
    pushEvent(
      'tribute_refused',
      `Tribute short by ${outcome.shortfall.toFixed(0)}. The balance is carried, with interest.`,
    )
  } else {
    pushEvent(
      'tribute_refused',
      `The Emperor is not paid. Patience ${outcome.quota.patience} of 3 remains.`,
    )
  }

  if (outcome.gameOver) {
    world.goalAchieved = true
    pushEvent('poc_goal_achieved', 'The Emperor recalls you. Arrakis is taken from your house.')
  }
}

/**
 * Apply a player crew order. Guards live in troops/assign.ts; this is the
 * mutation layer, and it reports refusals so the player is never left
 * wondering whether the click registered.
 */
export function assignCrew(
  groupId: string,
  task: TroopTask,
  targetId: string | null,
): void {
  const index = world.troopGroups.findIndex(g => g.id === groupId)
  if (index < 0) return

  const group = world.troopGroups[index]
  const target = targetId
    ? world.spiceFields.find(f => f.id === targetId)
    : undefined
  const hasThopter = carriedKinds(groupId).includes('thopter')

  const check = checkAssign({ group, task, target, hasThopter })
  if (!check.ok) {
    pushEvent('sietch_task_assigned', assignRefusalMessage(check.reason))
    return
  }

  world.troopGroups[index] = applyAssign(group, task, targetId)

  const label = task === 'idle'
    ? 'stand down'
    : task === 'harvest'
      ? `harvest ${target?.id ?? ''}`.trim()
      : task
  pushEvent('sietch_task_assigned', `Crew ordered to ${label}.`)
}
