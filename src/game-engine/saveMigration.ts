// src/game-engine/saveMigration.ts
// PURE save-schema migrations. Kept out of persistence.ts so they can be
// tested without IndexedDB.
//
// A save that fails to migrate must degrade to "start a new run", never to a
// half-populated world that crashes three minutes later. Every migration
// therefore fills in defaults rather than assuming a field exists.

import type { WorldState, Village, LocationKind } from '../types'
import { createQuotaState } from './quota/quota'
import { INITIAL_VILLAGES } from '../data/villages'

export const CURRENT_SAVE_VERSION = 2

export interface VersionedSave {
  version?: number
  savedAt: number
  state: unknown
}

/** Pre-v2 villages had no kind, discovered flag or regionId. */
type LegacyVillage = Omit<Village, 'kind' | 'discovered' | 'regionId'> &
  Partial<Pick<Village, 'kind' | 'discovered' | 'regionId'>>

/** Every id this build ships, with the kind it is actually authored as. */
const CURRENT_KIND_BY_ID: ReadonlyMap<string, LocationKind> = new Map(
  INITIAL_VILLAGES.map(v => [v.id, v.kind]),
)

/**
 * A pre-v2 save recorded no `kind` at all, so upgrading it has to invent one.
 *
 * This used to be a hardcoded id->kind table plus an "id contains 'sietch'"
 * guess, both authored against the original eight-location roster in
 * villages.ts and never revisited when villages.wider.ts and
 * villages.farside.ts added eleven more. The result: 13 of the 19 shipped
 * locations — everything whose id doesn't literally spell "sietch"
 * (habbanya_ridge, hagg, funeral_plain, plaster_basin, wind_pass, old_gap,
 * bight_of_cliff, and every farside village) — silently downgraded to
 * 'field_camp' on any save taken before v2, which is why sietchGate.ts
 * painted a diorama instead of mounting the 3D set at those places for a
 * player carrying an old save. sietch_tabr and red_wall_sietch happened to
 * still work, which is what let the release-round check miss it.
 *
 * The fix looks the id up in today's real roster instead of guessing — every
 * id a save can reference was, at some point, one of today's
 * INITIAL_VILLAGES, so this is exact rather than inferred, and it never goes
 * stale again when a new location is added. The old substring guess survives
 * only as a last-resort default for an id no longer in the current roster.
 */
function inferKind(id: string): LocationKind {
  const current = CURRENT_KIND_BY_ID.get(id)
  if (current) return current
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
    quota: state.quota ?? createQuotaState(),
    troopGroups: state.troopGroups ?? [],
    spiceFields: state.spiceFields ?? [],
    equipment: state.equipment ?? [],
    charisma: state.charisma ?? 20,
    act: state.act ?? 'act1',
    ending: state.ending ?? null,
    ecology: state.ecology ?? [],
    forts: state.forts ?? [],
    player: { ...state.player, prescience: state.player?.prescience ?? 0 },
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
