// src/game-engine/commands/assignCrewCommand.ts
// The assign-crew command wired through the CommandOutcome contract — 02
// "Crew lifecycle": "A crew has one task and one location. Reassignment
// applies one changeover cost exactly once." Chunk W2d.
//
// The pure precondition rules already live in troops/assign.ts
// (checkAssign/applyAssign); this is the mutation layer, replacing
// EconomySystem.ts's old `assignCrew` (which pushed its own ad hoc event and
// never reported a structured outcome for the "too far" gate).
//
// Changeover-once, by construction: `applyAssign` SETS `changeoverDaysLeft`
// (0 or `CHANGEOVER_DAYS`) rather than incrementing it, so no sequence of
// calls can ever push it past `CHANGEOVER_DAYS`. Replaying the identical
// command while a changeover is pending is refused by `checkAssign`'s
// `already-assigned` guard — task and target already match, so nothing is
// re-applied and the pending day is never re-charged. See
// assignCrewCommand.fixtures.test.ts's changeover-once fixture.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { checkAssign, applyAssign } from '../troops/assign'
import type { TroopTask } from '../troops/types'
import { carriedKinds } from '../economy/carried'
import { canOrderCrewRemotely } from '../EconomySystem'
import { ok, fail, type CommandOutcome } from './outcome'
import type { AssignRefusal } from '../troops/assign'

export type AssignCrewCode = 'assigned'
export type AssignCrewRefusal = 'unknown-crew' | 'crew-destroyed' | 'too-far' | AssignRefusal

export function runAssignCrewCommand(
  groupId: string,
  task: TroopTask,
  targetId: string | null,
): CommandOutcome<AssignCrewCode, AssignCrewRefusal> {
  const index = world.troopGroups.findIndex(g => g.id === groupId)
  if (index < 0) return fail('unknown-crew')

  const group = world.troopGroups[index]
  // Defensive: applyCasualty (troops/casualty.ts) dissolves any crew that
  // reaches size 0 and removes it from world.troopGroups, so this branch is
  // not reachable through production casualty writers today — kept as the
  // belt-and-suspenders guard 02's "A destroyed crew cannot remain
  // selectable" calls for, in case a future writer ever leaves one behind.
  if (group.size <= 0) return fail('crew-destroyed')

  if (!canOrderCrewRemotely(groupId)) return fail('too-far')

  const target = targetId ? world.spiceFields.find(f => f.id === targetId) : undefined
  const hasThopter = carriedKinds(groupId).includes('thopter')

  const check = checkAssign({ group, task, target, hasThopter })
  if (!check.ok) return fail(check.reason)

  world.troopGroups[index] = applyAssign(group, task, targetId)

  const label = task === 'idle'
    ? 'stand down'
    : task === 'harvest'
      ? `harvest ${target?.id ?? ''}`.trim()
      : task
  pushEvent('sietch_task_assigned', `Crew ordered to ${label}.`)

  return ok('assigned')
}
