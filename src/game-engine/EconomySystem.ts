// src/game-engine/EconomySystem.ts
// Day-boundary economy: harvest accrual and quota settlement.
//
// The pure rules live in troops/ and quota/; this module is the thin mutation
// layer that applies them to `world`, in the same shape as the other *System
// files. Keeping it thin is what lets the rules stay testable.

import { world } from './GameState'
import { pushEvent } from './EventSystem'
import { currentDay } from './TimeSystem'
import type { TroopTask } from './troops/types'
import { isDue, totalDue } from './quota/quota'
import { checkAssign, applyAssign, assignRefusalMessage } from './troops/assign'
import { canOrderRemotely } from './prescience/prescience'
import { buildPendingSettlement, AUTO_SHIP_UNLOCKED_FLAG, AUTO_SHIP_ENABLED_FLAG, AUTO_SHIP_AMOUNT_FLAG } from './quota/settlement'
import { applySettlement } from './economy/settlementRun'
import { evaluateEndingAuthority } from './economy/actRun'

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
export { runSietchLoyaltyDay } from './economy/sietchLoyaltyRun'

import { carriedKinds } from './economy/carried'


/**
 * Step 9: if tribute is due and no ending has occurred, either settle it
 * automatically (auto-shipment, once unlocked and opted in) or create the
 * pending settlement decision and let simulation pause for it
 * (docs/PRD/game-completion/02-runtime-consolidation.md "Tribute" and
 * "Day-boundary order"). Retires the old `runQuotaCheck` auto-settle-from-
 * -stock behavior (progress.md Round 7: "runQuotaCheck's auto-settle
 * dies") — a due deadline no longer pays itself; a player command
 * (commands/settleCommand.ts) or an explicit opt-in must act on it.
 *
 * Idempotent: a decision already pending is left alone rather than rebuilt,
 * so a multi-day catch-up call that lands on the SAME due day twice (it
 * cannot under crossedDays()'s per-day loop, but this guard costs nothing
 * and keeps the function safe to call more than once a day) never
 * replaces a decision the player may already be looking at.
 */
export function runTributeCheck(): void {
  if (world.ending !== null) return
  if (!isDue(world.quota, currentDay())) return
  if (world.pendingSettlement !== null) return

  const autoShipReady =
    world.flags[AUTO_SHIP_UNLOCKED_FLAG] === 1 && world.flags[AUTO_SHIP_ENABLED_FLAG] === 1

  if (autoShipReady) {
    // Configured amount defaults to the full amount due — a recorded
    // canonical-numbers decision (02 names no default; "pay in full unless
    // told otherwise" is the minimal-change reading of "the configured
    // auto-shipment amount").
    const configured = typeof world.flags[AUTO_SHIP_AMOUNT_FLAG] === 'number'
      ? (world.flags[AUTO_SHIP_AMOUNT_FLAG] as number)
      : totalDue(world.quota)
    applySettlement(Math.max(0, Math.min(configured, world.player.spice)))
    // Shared ending authority (economy/actRun.ts): if this payment drops
    // patience to 0, the ending is assigned here, same day, no pause ever
    // created — matching the settle command's "before simulation can
    // resume" rule with nothing to resume from.
    evaluateEndingAuthority()
    return
  }

  world.pendingSettlement = buildPendingSettlement(world.quota, world.player.spice)
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

