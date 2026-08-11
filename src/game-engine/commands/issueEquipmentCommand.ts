// src/game-engine/commands/issueEquipmentCommand.ts
// The issue-equipment command wired through the CommandOutcome contract —
// 02 "Equipment": "Issuing equipment targets a selected eligible crew.
// 'Issue to the first crew' is not an acceptable production behavior when
// multiple crews exist." Chunk W2d.
//
// Replaces marketOps.ts's old `issueEquipment`, which took a bare
// `groupId: string` and silently trusted the caller to have picked one —
// the caller it actually had (MarketPanel.tsx) defaulted to
// `troopGroups[0].id`, exactly the forbidden behavior. `groupId` here is
// `string | null`: a UI with no explicit selection passes `null` and gets a
// stable `'no-target'` refusal instead of a silent first-crew guess.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { checkIssue, issueTo, type IssueRefusal } from '../troops/equipment'
import { ok, fail, type CommandOutcome } from './outcome'

export type IssueEquipmentCode = 'issued'

export function runIssueEquipmentCommand(
  equipmentId: string,
  groupId: string | null,
): CommandOutcome<IssueEquipmentCode, IssueRefusal> {
  const index = world.equipment.findIndex(e => e.id === equipmentId)
  const item = index >= 0 ? world.equipment[index] : undefined
  const group = groupId ? world.troopGroups.find(g => g.id === groupId) : undefined

  const check = checkIssue(item, groupId, group)
  if (!check.ok) return fail(check.reason)

  // check.ok guarantees item and groupId are both non-null past this point.
  world.equipment[index] = issueTo(item!, groupId!)
  pushEvent('sietch_task_assigned', 'Equipment issued to the crew.')

  return ok('issued')
}
