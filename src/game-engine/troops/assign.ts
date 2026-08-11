// src/game-engine/troops/assign.ts
// PURE task-assignment rules for troop groups.
//
// Assignment is the player's main verb in Act 1, so every refusal has a
// distinct reason the UI can show. A button that silently does nothing is the
// fastest way to make a player think the game is broken.

import { MIN_TASK_SIZE, CHANGEOVER_DAYS } from './types'
import type { TroopGroup, TroopTask, SpiceField } from './types'

export type AssignRefusal =
  | 'too-small'
  | 'no-target'
  | 'target-undiscovered'
  | 'target-exhausted'
  | 'already-assigned'
  | 'needs-thopter'

export type AssignCheck =
  | { ok: true }
  | { ok: false; reason: AssignRefusal }

export interface AssignContext {
  group: TroopGroup
  task: TroopTask
  target: SpiceField | undefined
  /** Whether the group carries an ornithopter — required to prospect. */
  hasThopter: boolean
}

export function checkAssign(ctx: AssignContext): AssignCheck {
  const { group, task, target, hasThopter } = ctx

  if (group.size < MIN_TASK_SIZE) return { ok: false, reason: 'too-small' }

  if (task === group.task && group.taskTargetId === (target?.id ?? null)) {
    return { ok: false, reason: 'already-assigned' }
  }

  if (task === 'harvest') {
    if (!target) return { ok: false, reason: 'no-target' }
    if (!target.discovered) return { ok: false, reason: 'target-undiscovered' }
    if (target.remaining <= 0) return { ok: false, reason: 'target-exhausted' }
  }

  if (task === 'prospect' && !hasThopter) {
    return { ok: false, reason: 'needs-thopter' }
  }

  return { ok: true }
}

export function assignRefusalMessage(reason: AssignRefusal): string {
  switch (reason) {
    case 'too-small':
      return 'Too few hands left in this crew to work.'
    case 'no-target':
      return 'Choose a spice field first.'
    case 'target-undiscovered':
      return 'That sand has not been found yet.'
    case 'target-exhausted':
      return 'That field is worked out.'
    case 'already-assigned':
      return 'They are already at that work.'
    case 'needs-thopter':
      // 03-opening-experience.md "Recovery and refusal behavior": "identify
      // the equipment/location path" — the smuggler's den (MarketPanel.tsx,
      // villages.ts's tsimpo) sells them, not Arrakeen itself; it starts
      // undiscovered, so "once his den is found" names the real path rather
      // than a destination the player cannot yet reach.
      return 'Prospecting needs an ornithopter — buy one from the smuggler once his den is found.'
  }
}

/**
 * Apply an assignment.
 *
 * Reassignment costs a changeover day, so switching a crew mid-cycle is a real
 * trade rather than a free correction. Returning to idle is free — standing
 * down should never be punished.
 */
export function applyAssign(
  group: TroopGroup,
  task: TroopTask,
  targetId: string | null,
): TroopGroup {
  const changeover = task === 'idle' ? 0 : CHANGEOVER_DAYS
  return { ...group, task, taskTargetId: targetId, changeoverDaysLeft: changeover }
}
