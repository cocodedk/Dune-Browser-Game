// src/game-engine/sietch/assignTask.ts
// Pure functions for assigning tasks and pledging sietches to the player

import type { SietchState, SietchTask } from './types'
import { HARVEST_MIN_WORKERS, TRAIN_MIN_WORKERS } from './types'
import type { VillageId } from '../../types'

/**
 * Returns true only if the sietch is pledged to the player AND has enough
 * workers for the given task.
 */
export function canAssignTask(sietch: SietchState, task: SietchTask): boolean {
  if (!sietch.pledgedToPlayer) return false
  if (task === 'harvest_spice') return sietch.fremenWorkers >= HARVEST_MIN_WORKERS
  if (task === 'train_troops') return sietch.fremenWorkers >= TRAIN_MIN_WORKERS
  return false
}

/**
 * Immutable update — returns a new SietchState[].
 * For the matching sietch, if canAssignTask passes, sets currentTask and
 * resets outputProgress to 0. If preconditions fail the sietch is returned
 * unchanged (caller is responsible for gating).
 */
export function assignTask(
  sietches: SietchState[],
  villageId: VillageId,
  task: SietchTask,
): SietchState[] {
  return sietches.map((s) => {
    if (s.villageId !== villageId) return s
    if (!canAssignTask(s, task)) return s
    return { ...s, currentTask: task, outputProgress: 0 }
  })
}

/**
 * Immutable update — sets pledgedToPlayer = true on the matching sietch.
 * Idempotent: pledging an already-pledged sietch is a no-op.
 */
export function pledgeSietch(sietches: SietchState[], villageId: VillageId): SietchState[] {
  return sietches.map((s) => {
    if (s.villageId !== villageId) return s
    if (s.pledgedToPlayer) return s
    return { ...s, pledgedToPlayer: true }
  })
}

/**
 * Number of sietches currently pledged.
 *
 * Callers write this straight into world.flags['pledged.count'] after any
 * mutation that can change pledge state, rather than incrementing a counter
 * — a loaded save has to land on the true count, not on how many pledge
 * calls happened this session.
 */
export function pledgedCount(sietches: readonly SietchState[]): number {
  return sietches.filter(s => s.pledgedToPlayer).length
}
