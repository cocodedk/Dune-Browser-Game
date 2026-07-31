// src/game-engine/economy/prospectRun.ts
// One day of prospecting for new spice fields.

/** Finds already made in a region, tracked on flags so it survives saves. */
function regionFinds(regionId: string): number {
  const value = world.flags[`finds.${regionId}`]
  return typeof value === 'number' ? value : 0
}

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { findChance, resolveFind, regionExhausted, findMessage } from '../troops/prospect'
import { nextFind, siteYield } from '../desert/sites'
import { canSenseHidden } from '../prescience/prescience'

/**
 * How far a crew can range, in days.
 *
 * On foot the deep desert is out of reach entirely; a thopter is what opens
 * it. That is the point of the vehicle, and the reason the far side of the
 * planet is worth anything.
 */
function prospectRange(hasThopter: boolean): number {
  return hasThopter ? 7 : 2
}

/**
 * A prospecting crew's chance of turning up something out in the deep desert
 * rather than another field in the settled regions.
 */
const DEEP_DESERT_CHANCE = 0.18

/**
 * Run one day of prospecting for every crew out looking.
 *
 * Rolls come from Math.random here at the mutation layer; the rules themselves
 * take injected rolls so they stay deterministic under test.
 */
export function runProspectDay(): void {
  revealDesertSite()
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

    // A hidden sietch is not the player's to find without Awareness — the
    // prescience ladder documents this as its level-1 grant, and it is
    // inert unless something actually checks it. Treat the roll exactly
    // like `nothing`: no count, no reveal, no message. The alternative —
    // counting the find and announcing "a sietch no map records" while
    // revealing nothing — tells the player they got a reward they did not
    // earn, which is worse than staying silent.
    if (outcome.kind === 'sietch' && !canSenseHidden(world.player.prescience)) continue

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


/**
 * Sometimes a prospecting crew comes back with a location instead of a field.
 *
 * Rolls come from Math.random at this mutation layer; the rules stay pure.
 */
function revealDesertSite(): void {
  const crews = world.troopGroups.filter(
    g => g.task === 'prospect' && g.changeoverDaysLeft === 0,
  )
  if (crews.length === 0) return
  if (Math.random() >= DEEP_DESERT_CHANCE) return

  const hasThopter = world.equipment.some(
    e => crews.some(c => c.id === e.groupId) &&
         (e.kind === 'thopter' || e.kind === 'lr_thopter'),
  )

  const site = nextFind(world.desertSites, prospectRange(hasThopter), Math.random())
  if (!site) return

  const index = world.desertSites.findIndex(s => s.id === site.id)
  world.desertSites[index] = { ...site, discovered: true }
  pushEvent('village_selected', siteYield(site.kind).message)
}
