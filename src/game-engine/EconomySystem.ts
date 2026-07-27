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
import { settleQuota, isDue, totalDue, onActTransition } from './quota/quota'
import { checkAssign, applyAssign, assignRefusalMessage } from './troops/assign'
import { findChance, resolveFind, regionExhausted, findMessage } from './troops/prospect'
import { checkPurchase, purchaseRefusalMessage } from './market/market'
import { evaluateAct, actQuotaMultiplier } from './acts/transitions'
import {
  trainDay, raidInterval, raidPower, resolveCombat, weaponTier, applyLosses,
} from './combat/resolve'
import type { ActWorldView, EndingId } from './acts/transitions'

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
    const paidCount = typeof world.flags['quota.paidInFull'] === 'number'
      ? (world.flags['quota.paidInFull'] as number) : 0
    world.flags['quota.paidInFull'] = paidCount + 1
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

/** Build the act machine's view of the world from live state. */
function actView(): ActWorldView {
  const pledged = world.sietches.filter(s => s.pledgedToPlayer)
  const loyalties = pledged
    .map(s => world.villages.find(v => v.id === s.villageId)?.loyalty ?? 0)
  const avgLoyalty = loyalties.length
    ? loyalties.reduce((a, b) => a + b, 0) / loyalties.length
    : 0

  return {
    act: world.act,
    quotasPaid: typeof world.flags['quota.paidInFull'] === 'number'
      ? (world.flags['quota.paidInFull'] as number) : 0,
    pledgedCount: pledged.length,
    charisma: world.charisma,
    patience: world.quota.patience,
    raidsRepelled: typeof world.flags['raids.repelled'] === 'number'
      ? (world.flags['raids.repelled'] as number) : 0,
    maxRegionVegetation: 0,
    fortsDestroyed: 0,
    capitalFortDestroyed: false,
    palaceHeld: true,
    greenRegions: 0,
    averagePledgedLoyalty: avgLoyalty,
    countdownExpired: false,
  }
}

/**
 * Day-boundary act check. An ending stops the run; an advance escalates the
 * quota and clears the once-per-act patience allowance.
 */
export function runActCheck(): void {
  if (world.goalAchieved) return

  const { ending, nextAct } = evaluateAct(actView())

  if (ending) {
    world.goalAchieved = true
    world.ending = ending
    pushEvent('poc_goal_achieved', endingMessage(ending))
    return
  }

  if (nextAct) {
    world.act = nextAct
    world.flags['act.startedDay'] = currentDay()
    world.quota = onActTransition(world.quota)
    world.quota = {
      ...world.quota,
      amount: Math.round(world.quota.amount * actQuotaMultiplier(nextAct)),
    }
    pushEvent('poc_goal_achieved', `The story turns. (${nextAct})`)
  }
}

function endingMessage(ending: EndingId): string {
  switch (ending) {
    case 'loss_patience':
      return 'The Emperor recalls you. Arrakis is taken from your house.'
    case 'loss_palace':
      return 'The palace is lost. Your hold on Arrakis ends here.'
    case 'loss_abandoned':
      return 'The last sietch turns from you. You rule nothing but sand.'
    case 'win_military':
      return 'The Harkonnen capital falls. Arrakis is yours.'
    case 'win_ecology':
      return 'The desert greens and the Fremen rise. The occupation is over.'
  }
}

/** One day of drill for every crew assigned to training. */
export function runTrainingDay(): void {
  const hasTutor = world.flags['recruited.voss'] === true

  for (const group of world.troopGroups) {
    if (group.task !== 'train' || group.changeoverDaysLeft > 0) continue

    const kinds = carriedKinds(group.id)
    const before = group.skills.military
    group.skills.military = trainDay(before, hasTutor, kinds.includes('sonic_disruptor'))

    // Drill is dull: morale slips unless the player has visited recently.
    if (group.skills.military > before) group.morale = Math.max(0, group.morale - 1)
  }
}

/**
 * The Harkonnen raid clock.
 *
 * Raids target a pledged sietch and are resolved against whatever garrison is
 * standing there. A sietch with no crew present still defends — its people
 * fight — but badly, which is the cost of leaving it uncovered.
 */
export function runRaidCheck(): void {
  const interval = raidInterval(world.act)
  if (interval === null) return

  const day = currentDay()
  const nextRaid = typeof world.flags['raids.nextDay'] === 'number'
    ? (world.flags['raids.nextDay'] as number)
    : day + interval

  if (day < nextRaid) {
    world.flags['raids.nextDay'] = nextRaid
    return
  }
  world.flags['raids.nextDay'] = day + interval

  const pledged = world.sietches.filter(s => s.pledgedToPlayer)
  if (pledged.length === 0) return

  // Deterministic target choice: the raid falls on the least defended sietch,
  // which rewards the player for spreading cover rather than stacking one.
  const target = pledged.reduce((weakest, s) => {
    const here = world.troopGroups.filter(g => g.locationId === s.villageId)
    const strength = here.reduce((sum, g) => sum + g.size * (g.skills.military / 100), 0)
    const weakestHere = world.troopGroups.filter(g => g.locationId === weakest.villageId)
    const weakestStrength = weakestHere.reduce(
      (sum, g) => sum + g.size * (g.skills.military / 100), 0,
    )
    return strength < weakestStrength ? s : weakest
  }, pledged[0])

  const daysIntoAct = typeof world.flags['act.startedDay'] === 'number'
    ? day - (world.flags['act.startedDay'] as number)
    : day
  const config = getDifficultyConfig(world.difficulty)
  const power = raidPower(daysIntoAct, config.aiAggressionMultiplier)

  const defenders = world.troopGroups.filter(g => g.locationId === target.villageId)
  const defenderSize = defenders.reduce((sum, g) => sum + g.size, 0)
  const defenderSkill = defenders.length
    ? defenders.reduce((sum, g) => sum + g.skills.military, 0) / defenders.length
    : 15 // Untrained villagers, not nothing.

  const weapon = weaponTier(
    defenders.flatMap(g => carriedKinds(g.id)),
  )

  const outcome = resolveCombat(
    { size: power / 2, militarySkill: 60, weapon: 'krys', defending: false },
    { size: defenderSize || 20, militarySkill: defenderSkill, weapon, defending: true },
    Math.random(),
  )

  const place = world.villages.find(v => v.id === target.villageId)
  const name = place?.name ?? target.villageId

  // Spread casualties across the defending crews.
  if (defenders.length > 0 && outcome.defenderLosses > 0) {
    const each = Math.floor(outcome.defenderLosses / defenders.length)
    for (const group of defenders) {
      const index = world.troopGroups.findIndex(g => g.id === group.id)
      if (index >= 0) world.troopGroups[index] = applyLosses(group, each)
    }
  }

  if (outcome.attackerWins) {
    const sietchIndex = world.sietches.findIndex(s => s.villageId === target.villageId)
    if (sietchIndex >= 0) {
      const sietch = world.sietches[sietchIndex]
      world.sietches[sietchIndex] = { ...sietch, pledgedToPlayer: sietch.pledgedToPlayer }
    }
    pushEvent('attack', `Harkonnen raiders break ${name}. ${outcome.defenderLosses} Fremen fall.`)
  } else {
    const repelled = typeof world.flags['raids.repelled'] === 'number'
      ? (world.flags['raids.repelled'] as number) : 0
    world.flags['raids.repelled'] = repelled + 1
    pushEvent('attack', `${name} holds. The raiders withdraw, leaving ${outcome.attackerLosses}.`)
  }
}
