// src/game-engine/SietchSystem.ts
// Handler module: mutates world.sietches in response to player commands
// and emits game events. Analogous to TravelSystem.ts.

import { world } from './GameState'
import { CHARISMA_PER_PLEDGE } from './sietch/loyalty'
import { pushEvent } from './EventSystem'
import { pledgeSietch, assignTask, canAssignTask } from './sietch/assignTask'
import type { SietchTask } from './sietch/types'
import type { VillageId } from '../types'

function taskLabel(task: SietchTask): string {
  return task === 'harvest_spice' ? 'harvesting spice' : 'training as Fedaykin'
}

/**
 * Pledge the Fremen sietch at villageId to the player.
 * Guards: sietch exists, player is present, village owner is 'fremen',
 * not already pledged.
 */
export function pledgePlayerSietch(villageId: VillageId): void {
  const sietch = world.sietches.find(s => s.villageId === villageId)
  if (!sietch) return

  if (world.player.location !== villageId) return

  const village = world.villages.find(v => v.id === villageId)
  if (!village || village.owner !== 'fremen') return

  if (sietch.pledgedToPlayer) return

  world.charisma += CHARISMA_PER_PLEDGE

  world.sietches = pledgeSietch(world.sietches, villageId)
  pushEvent(
    'sietch_pledged',
    `The Fremen at ${village.name} pledge their loyalty to you.`,
  )
}

/**
 * Assign a task to the Fremen sietch at villageId.
 * Guards: sietch exists, canAssignTask passes, player is present.
 */
export function assignPlayerSietchTask(
  villageId: VillageId,
  task: SietchTask,
): void {
  const sietch = world.sietches.find(s => s.villageId === villageId)
  if (!sietch) return

  if (!canAssignTask(sietch, task)) return

  if (world.player.location !== villageId) return

  world.sietches = assignTask(world.sietches, villageId, task)

  const village = world.villages.find(v => v.id === villageId)
  const name = village?.name ?? villageId
  pushEvent('sietch_task_assigned', `Fremen at ${name} begin ${taskLabel(task)}`)
}

/**
 * Clear the current task at villageId. Resets progress.
 */
export function stopPlayerSietchTask(villageId: VillageId): void {
  const sietch = world.sietches.find(s => s.villageId === villageId)
  if (!sietch || sietch.currentTask === null) return
  world.sietches = world.sietches.map(s =>
    s.villageId === villageId ? { ...s, currentTask: null, outputProgress: 0 } : s,
  )
}
