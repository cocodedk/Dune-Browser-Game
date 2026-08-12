// src/game-engine/sietch/assignTask.ts
// Pure functions for pledging sietches to the player, and counting pledges.
//
// canAssignTask/assignTask (the legacy threshold task system's underlying
// pure mechanism) were removed in WP02e along with their SietchSystem
// wrappers (assignPlayerSietchTask/stopPlayerSietchTask) — see
// legacy-authority-inventory.md category 2.

import type { SietchState } from './types'
import type { VillageId } from '../../types'

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
