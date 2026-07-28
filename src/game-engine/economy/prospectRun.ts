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
