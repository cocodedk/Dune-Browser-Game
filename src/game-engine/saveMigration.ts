// src/game-engine/saveMigration.ts
// PURE save-schema migrations. Kept out of persistence.ts so they can be
// tested without IndexedDB.
//
// A save that fails to migrate must degrade to "start a new run", never to a
// half-populated world that crashes three minutes later. Every migration
// therefore fills in defaults rather than assuming a field exists.

import type { WorldState, Village, LocationKind } from '../types'

export const CURRENT_SAVE_VERSION = 2

export interface VersionedSave {
  version?: number
  savedAt: number
  state: unknown
}

/** Pre-v2 villages had no kind, discovered flag or regionId. */
type LegacyVillage = Omit<Village, 'kind' | 'discovered' | 'regionId'> &
  Partial<Pick<Village, 'kind' | 'discovered' | 'regionId'>>

const KIND_BY_ID: Readonly<Record<string, LocationKind>> = {
  arrakeen: 'palace',
  carthag: 'fort',
  imperial_basin: 'station',
  tsimpo: 'smuggler_den',
  cielago_depression: 'field_camp',
}

function inferKind(id: string): LocationKind {
  if (KIND_BY_ID[id]) return KIND_BY_ID[id]
  return id.includes('sietch') ? 'sietch' : 'field_camp'
}

/**
 * v1 -> v2: add Location fields and the explicit pause flag.
 *
 * Everything a v1 save knew about is preserved. New fields take the most
 * permissive defaults — in particular every existing location is marked
 * discovered, because a v1 player had already been able to travel anywhere and
 * retroactively hiding places would strand them.
 */
export function migrateV1ToV2(state: WorldState): WorldState {
  const villages = (state.villages as LegacyVillage[]).map(
    (v): Village => ({
      ...v,
      kind: v.kind ?? inferKind(v.id),
      discovered: v.discovered ?? true,
      regionId: v.regionId ?? v.id,
    }),
  )

  return {
    ...state,
    villages,
    paused: state.paused ?? false,
    flags: state.flags ?? {},
  }
}

/**
 * Bring any supported save up to the current schema.
 * Returns null when the save is too old, unrecognised, or structurally broken.
 */
export function migrateSave(save: VersionedSave): WorldState | null {
  const state = save.state as WorldState | null
  if (!state || typeof state !== 'object') return null
  if (!Array.isArray(state.villages) || !state.player) return null

  // Saves written before versioning are v1 by definition.
  const version = save.version ?? 1

  if (version > CURRENT_SAVE_VERSION) return null // Written by a newer build.
  if (version === CURRENT_SAVE_VERSION) return state
  return migrateV1ToV2(state)
}
