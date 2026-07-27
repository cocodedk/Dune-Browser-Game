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
import { findChance, resolveFind, regionExhausted, findMessage } from './troops/prospect'
import { checkPurchase, purchaseRefusalMessage } from './market/market'

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

/** Finds already made in a region, tracked on flags so it survives saves. */
function regionFinds(regionId: string): number {
  const value = world.flags[`finds.${regionId}`]
  return typeof value === 'number' ? value : 0
}

/**
 * Run one day of prospecting for every crew out looking.
 *
 * Rolls come from Math.random here at the mutation layer; the rules themselves
 * take injected rolls so they stay deterministic under test.
 */
export function runProspectDay(): void {
  for (const group of world.troopGroups) {
    if (group.task !== 'prospect') continue
    if (group.changeoverDaysLeft > 0) continue

    const regionId = group.taskTargetId ?? group.locationId
    if (regionExhausted(regionFinds(regionId))) continue

    const region = world.regions.find(r => r.id === regionId)
    const richness = region?.spice ?? 30

    const chance = findChance(group.skills.prospect, richness, false)
    const outcome = resolveFind(chance, Math.random(), Math.random(), richness)
    if (outcome.kind === 'nothing') continue

    world.flags[`finds.${regionId}`] = regionFinds(regionId) + 1

    if (outcome.kind === 'field' && outcome.density) {
      const capacity = outcome.density * 8
      world.spiceFields.push({
        id: `field_found_${regionId}_${world.spiceFields.length}`,
        regionId,
        position: region ? { x: 0, y: 0 } : { x: 0, y: 0 },
        discovered: true,
        density: outcome.density,
        capacity,
        remaining: capacity,
      })
    } else if (outcome.kind === 'skill' && outcome.skillGain) {
      group.skills.prospect += outcome.skillGain
    } else if (outcome.kind === 'sietch') {
      // Reveal an undiscovered location — the main non-dialogue discovery path.
      const hidden = world.villages.find(v => !v.discovered)
      if (hidden) hidden.discovered = true
    }

    pushEvent('sietch_task_assigned', findMessage(outcome))
  }
}

/** Buy from the smuggler. Guards live in market/market.ts. */
export function buyEquipment(kind: EquipmentKind): void {
  const standing = typeof world.flags['smuggler.standing'] === 'number'
    ? (world.flags['smuggler.standing'] as number)
    : 0

  const check = checkPurchase(kind, {
    spice: world.player.spice,
    standing,
    tier3Unlocked: false,
  })

  if (!check.ok) {
    pushEvent('sietch_task_assigned', purchaseRefusalMessage(check.reason))
    return
  }

  world.player.spice -= check.item.price
  world.flags['smuggler.standing'] = standing + 1
  world.equipment.push({
    id: `eq_${kind}_${world.equipment.length}`,
    kind,
    locationId: world.player.location,
    groupId: null,
    condition: 100,
  })
  pushEvent('spice_shipment_received', `Bought ${check.item.label} for ${check.item.price} spice.`)
}

/** Hand a piece of equipment to a crew. */
export function issueEquipment(equipmentId: string, groupId: string): void {
  const item = world.equipment.find(e => e.id === equipmentId)
  if (!item) return
  if (item.groupId) {
    pushEvent('sietch_task_assigned', 'That equipment is already with a crew.')
    return
  }
  item.groupId = groupId
  item.locationId = null
  pushEvent('sietch_task_assigned', 'Equipment issued to the crew.')
}
