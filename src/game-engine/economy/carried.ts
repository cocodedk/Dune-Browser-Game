// src/game-engine/economy/carried.ts
// What equipment a crew has with them. Shared by every day-runner, so it lives
// on its own rather than being duplicated once per split file.

import { world } from '../GameState'
import type { EquipmentKind } from '../troops/types'

/** Equipment kinds a group is carrying. */
export function carriedKinds(groupId: string): EquipmentKind[] {
  return world.equipment
    .filter(e => e.groupId === groupId)
    .map(e => e.kind)
}
