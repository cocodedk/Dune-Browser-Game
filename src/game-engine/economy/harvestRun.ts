// src/game-engine/economy/harvestRun.ts
// One day of spice extraction, and the worms that interrupt it.
//
// Split out of EconomySystem, which had grown past the repository's file
// limit. The pure maths lives in troops/harvest.ts and worms/wormsign.ts;
// this is the mutation layer that applies it to `world`.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { DAY_SECONDS } from '../TimeSystem'
import { getDifficultyConfig } from '../difficulty'
import { harvestDay, resolveWorm } from '../troops/harvest'
import { extractionTier } from '../troops/types'
import { pruneSightings } from '../worms/wormsign'
import { carriedKinds } from './carried'

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

    const kinds = carriedKinds(group.id)
    const tier = extractionTier(kinds)
    const { extracted, field } = harvestDay(group, world.spiceFields[fieldIndex], tier)

    if (extracted > 0) {
      world.spiceFields[fieldIndex] = field
      dayTotal += extracted
    }

    // Worms. The rules for this were written and tested long ago and then
    // never called, so in practice no crew on Arrakis had ever been taken.
    // Rolls come from Math.random at this mutation layer; the rules stay pure.
    const hasHarvester = kinds.includes('harvester') || kinds.includes('heavy_harvester')
    const hasThopter = kinds.includes('thopter') || kinds.includes('lr_thopter')
    const worm = resolveWorm(hasHarvester, hasThopter, Math.random())

    if (worm.attacked) {
      world.wormSightings.push({ fieldId: field.id, atTime: world.time })

      if (worm.casualtyFraction > 0) {
        const lost = Math.max(1, Math.round(group.size * worm.casualtyFraction))
        group.size = Math.max(0, group.size - lost)
        for (const item of world.equipment) {
          if (item.groupId !== group.id) continue
          item.condition = Math.max(0, item.condition - worm.equipmentDamage)
        }
        pushEvent(
          'attack',
          `A maker takes the crew at ${field.id}. ${lost} lost, the harvester mauled.`,
        )
        // A crew that has just watched a worm eat their machine does not carry
        // on working that field.
        group.task = 'idle'
        group.taskTargetId = null
      } else {
        pushEvent(
          'attack',
          `Wormsign at ${field.id}. The thopter lifts the crew clear in time.`,
        )
      }
    }

    // A worked-out field releases its crew rather than silently idling them,
    // so the player is told to reassign instead of quietly earning nothing.
    if (field.remaining <= 0 && group.taskTargetId === field.id) {
      group.task = 'idle'
      group.taskTargetId = null
      pushEvent('spice_shipment_received', `The sand at ${field.id} is spent. Your crew awaits orders.`)
    }
  }

  // Old wormsign fades off the map. Without this a long game accumulates one
  // entry per attack forever, and the list is written into every save.
  world.wormSightings = pruneSightings(world.wormSightings, world.time, DAY_SECONDS)

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
