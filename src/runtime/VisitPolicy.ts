// src/runtime/VisitPolicy.ts
// PURE decision logic for clicking a village marker. No side effects, no
// EventBus, no engine mutation — the caller (render layer) dispatches the
// returned action.

import type { VillageId, WorldState } from '../types'

export type VisitAction =
  | { kind: 'none' } // traveling or in dialogue — click is ignored
  | { kind: 'travel'; targetId: VillageId }
  | { kind: 'dialogue'; treeId: string; villageId: VillageId }
  | { kind: 'event'; message: string } // own territory

/**
 * Decide what a click on `locationId` should do, given the current world.
 *
 * Blocked while traveling or mid-dialogue. At the player's own location:
 * owner === 'player' fires the "your territory" event, 'harkonnen' opens the
 * harkonnen_stronghold dialogue tree, anything else opens village_leader.
 * Anywhere else, the click starts travel.
 */
export function decideVisit(world: WorldState, locationId: VillageId): VisitAction {
  if (world.player.state === 'traveling') return { kind: 'none' }
  if (world.dialogue !== null) return { kind: 'none' }

  const village = world.villages.find(v => v.id === locationId)
  if (!village) return { kind: 'none' }

  if (world.player.location !== locationId) {
    return { kind: 'travel', targetId: locationId }
  }

  if (village.owner === 'player') {
    return { kind: 'event', message: `You are at ${village.name} — your territory.` }
  }
  if (village.owner === 'harkonnen') {
    return { kind: 'dialogue', treeId: 'harkonnen_stronghold', villageId: village.id }
  }
  return { kind: 'dialogue', treeId: 'village_leader', villageId: village.id }
}
