// src/game-engine/economy/upkeepRun.ts
// The two quiet daily runs: planting and drill.
//
// Neither produces spice. Both are the player choosing to spend crews on
// something other than income, which is the decision the whole middle game
// is built around.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { trainDay } from '../combat/resolve'
import {
  ecologyDay, SETTLED_THRESHOLD, GREEN_THRESHOLD,
} from '../ecology/ecology'
import { carriedKinds } from './carried'

/** One day of planting for every region with crews on ecology work. */
export function runEcologyDay(): void {
  world.ecology = world.ecology.map(region => {
    const crews = world.troopGroups.filter(
      g => g.task === 'ecology' &&
           g.changeoverDaysLeft === 0 &&
           (g.taskTargetId ?? g.locationId) === region.regionId,
    )

    const workers = crews.reduce((sum, g) => sum + g.size, 0)
    const skill = crews.length
      ? crews.reduce((sum, g) => sum + g.skills.ecology, 0) / crews.length
      : 0
    const hasBulbs = crews.some(g => carriedKinds(g.id).includes('bulb_cache'))

    const before = region.vegetation
    const after = ecologyDay(region, workers, skill, hasBulbs)

    // Announce the thresholds, since their effects are otherwise invisible.
    if (before < SETTLED_THRESHOLD && after.vegetation >= SETTLED_THRESHOLD) {
      pushEvent('spice_shipment_received', `Green takes hold at ${region.regionId}.`)
    }
    if (before < GREEN_THRESHOLD && after.vegetation >= GREEN_THRESHOLD) {
      pushEvent(
        'spice_shipment_received',
        `${region.regionId} is green. No spice will blow here again.`,
      )
    }
    return after
  })
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
