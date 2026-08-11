// src/game-engine/SietchSystem.ts
// Handler module: mutates world.sietches in response to player commands
// and emits game events. Analogous to TravelSystem.ts.

import { world } from './GameState'
import { CHARISMA_PER_PLEDGE } from './sietch/loyalty'
import { pushEvent } from './EventSystem'
import { pledgeSietch, pledgedCount, assignTask, canAssignTask } from './sietch/assignTask'
import { ok, fail, type CommandOutcome } from './commands/outcome'
import type { SietchTask } from './sietch/types'
import type { VillageId } from '../types'

function taskLabel(task: SietchTask): string {
  return task === 'harvest_spice' ? 'harvesting spice' : 'training as Fedaykin'
}

/**
 * Every reason pledgePlayerSietch currently refuses a pledge, named as a
 * stable code — docs/PRD/game-completion/02-runtime-consolidation.md
 * "Command outcome contract". These mirror today's guard order exactly.
 * Loyalty and charisma-cap checks (sietch/loyalty.ts's checkPledge) are NOT
 * part of this list: pledgePlayerSietch does not run them today, and this
 * chunk wraps the existing rules rather than rewriting them — the atomic
 * five-step chain is chunk W2b's.
 */
export type PledgeGuardRefusal = 'no-sietch' | 'not-present' | 'not-fremen' | 'already-pledged'

/**
 * Read-only precondition check for pledging villageId, against live
 * `world` state. pledgePlayerSietch calls this before mutating anything;
 * commands/pledgeCommand.ts (the CommandOutcome dispatch seam) calls it
 * again to classify a refusal without touching state. Checking twice costs
 * nothing (both reads are pure) and keeps each caller independently
 * defended against a stale UI — the same defence DialogueSystem's
 * attemptRitual re-check already takes against its own gate.
 */
export function checkPledgeGuards(villageId: VillageId): CommandOutcome<'ok', PledgeGuardRefusal> {
  const sietch = world.sietches.find(s => s.villageId === villageId)
  if (!sietch) return fail('no-sietch')

  if (world.player.location !== villageId) return fail('not-present')

  const village = world.villages.find(v => v.id === villageId)
  if (!village || village.owner !== 'fremen') return fail('not-fremen')

  if (sietch.pledgedToPlayer) return fail('already-pledged')

  return ok('ok')
}

/**
 * Pledge the Fremen sietch at villageId to the player.
 * Guards: sietch exists, player is present, village owner is 'fremen',
 * not already pledged — see checkPledgeGuards.
 */
export function pledgePlayerSietch(villageId: VillageId): void {
  if (!checkPledgeGuards(villageId).ok) return

  // Safe: checkPledgeGuards already confirmed a fremen-owned village exists
  // at villageId.
  const village = world.villages.find(v => v.id === villageId)!

  world.charisma += CHARISMA_PER_PLEDGE

  world.sietches = pledgeSietch(world.sietches, villageId)
  // Derived from the list rather than incremented — sova.ritual_available
  // gates on this flag, and a loaded save must report the true number
  // pledged, not how many pledge calls happened in this session.
  world.flags['pledged.count'] = pledgedCount(world.sietches)
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
