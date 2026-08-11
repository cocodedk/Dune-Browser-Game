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
import { applyCasualty } from '../troops/casualty'
import { pruneSightings } from '../worms/wormsign'
import { carriedKinds } from './carried'
import type { RngService } from '../rng/rng'

/**
 * Run one day of harvesting for every assigned crew.
 * Spice accrues continuously to the player's stock — the shipment event is
 * kept as the player-facing notification.
 *
 * `rng` is one seeded service instance for the whole day (see
 * dayRunner.ts's header) — the worm roll below draws from it instead of
 * Math.random(), per 02-runtime-consolidation.md "Randomness".
 */
export function runHarvestDay(rng: RngService): void {
  let dayTotal = 0
  // Snapshot ids, not group objects: a worm casualty this same pass can
  // dissolve or merge a crew (troops/casualty.ts), which replaces
  // world.troopGroups with a new array — any `group` reference captured
  // before that call would go stale. Every group below is looked up fresh
  // by id, so a group a prior iteration already dissolved/merged away is
  // simply not found and skipped.
  const groupIds = world.troopGroups.map(g => g.id)

  for (const groupId of groupIds) {
    const group = world.troopGroups.find(g => g.id === groupId)
    if (!group) continue
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
    // Rolls come from the day's seeded rng at this mutation layer; the
    // rules stay pure.
    const hasHarvester = kinds.includes('harvester') || kinds.includes('heavy_harvester')
    const hasThopter = kinds.includes('thopter') || kinds.includes('lr_thopter')
    const worm = resolveWorm(hasHarvester, hasThopter, rng.next())

    if (worm.attacked) {
      world.wormSightings.push({ fieldId: field.id, atTime: world.time })

      if (worm.casualtyFraction > 0) {
        // Equipment condition is out of scope (docs/PRD/game-completion/
        // 02-runtime-consolidation.md "Equipment"): resolveWorm still
        // reports `equipmentDamage` (its pure shape is pinned by
        // harvest.test.ts and stays useful narrative color for the event
        // text below), but nothing applies it to Equipment.condition
        // anymore — see troops/types.ts's Equipment doc for the decision.
        const lost = Math.max(1, Math.round(group.size * worm.casualtyFraction))
        const result = applyCasualty(world.troopGroups, world.equipment, world.sietches, group.id, lost)
        world.troopGroups = result.groups
        world.equipment = result.equipment
        world.sietches = result.sietches

        pushEvent(
          'attack',
          `A maker takes the crew at ${field.id}. ${lost} lost, the harvester mauled.`,
        )

        // A crew that has just watched a worm eat their machine does not
        // carry on working that field — but only the surviving, still-
        // standalone crew: a dissolved crew has no task left to clear, and
        // a merged crew keeps the absorbing crew's own task rather than
        // being force-idled into it.
        if (result.outcome === 'shrunk' && result.survivorId) {
          const survivorIndex = world.troopGroups.findIndex(g => g.id === result.survivorId)
          if (survivorIndex >= 0) {
            world.troopGroups[survivorIndex] = {
              ...world.troopGroups[survivorIndex], task: 'idle', taskTargetId: null,
            }
          }
        }
        continue
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
