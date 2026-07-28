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
import { CHARISMA_PER_QUOTA } from './sietch/loyalty'
import type { TroopTask } from './troops/types'
import { settleQuota, isDue, totalDue } from './quota/quota'
import { checkAssign, applyAssign, assignRefusalMessage } from './troops/assign'
import { canOrderRemotely } from './prescience/prescience'

// The day-runners moved into economy/ when this file outgrew the repository's
// 200-line limit. Re-exported here so every existing caller and test keeps
// importing from the same place.
export { runHarvestDay } from './economy/harvestRun'
export { runRaidCheck } from './economy/raidRun'
export { runProspectDay } from './economy/prospectRun'
export { runActCheck } from './economy/actRun'
export { runEcologyDay, runTrainingDay } from './economy/upkeepRun'
export { buyEquipment, issueEquipment } from './economy/marketOps'
export { attemptRitual, assaultFort } from './economy/endgameOps'

import { carriedKinds } from './economy/carried'


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
    const paidCount = typeof world.flags['quota.paidInFull'] === 'number'
      ? (world.flags['quota.paidInFull'] as number) : 0
    world.flags['quota.paidInFull'] = paidCount + 1
    world.charisma += CHARISMA_PER_QUOTA
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
    // Recorded, not just announced: without this the overlay had no way to
    // know the run had ended badly, and captioned it a victory.
    world.ending = 'loss_patience'
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
  if (!canOrderCrewRemotely(groupId)) {
    pushEvent('sietch_task_assigned', 'They are too far to hear you.')
    return
  }
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












/**
 * Whether the player may issue orders to a crew they are not standing with.
 * Before Farspeech, presence is required — that constraint is what makes
 * travel time a cost in the early game.
 */
export function canOrderCrewRemotely(groupId: string): boolean {
  if (canOrderRemotely(world.player.prescience)) return true
  const group = world.troopGroups.find(g => g.id === groupId)
  return group ? group.locationId === world.player.location : false
}

