// src/game-engine/saveMigration.test.ts

import { describe, it, expect } from 'vitest'
import { migrateV1ToV2, migrateSave, CURRENT_SAVE_VERSION } from './saveMigration'
import type { VersionedSave } from './saveMigration'
import type { WorldState } from '../types'
import { INITIAL_VILLAGES } from '../data/villages'

/** A minimal v1-shaped world: no kind, discovered, regionId or paused. */
function legacyState(): WorldState {
  return {
    time: 120,
    speed: 1,
    villages: [
      { id: 'sietch_tabr', name: 'Sietch Tabr', position: { x: 10, y: 20 }, population: 100, spice: 5, loyalty: 70, owner: 'fremen', status: 'friendly', productionRate: 1 },
      { id: 'arrakeen', name: 'Arrakeen', position: { x: 50, y: 60 }, population: 800, spice: 9, loyalty: 40, owner: 'harkonnen', status: 'neutral', productionRate: 2 },
      { id: 'carthag', name: 'Carthag', position: { x: 90, y: 30 }, population: 600, spice: 3, loyalty: 20, owner: 'harkonnen', status: 'rebelling', productionRate: 1.5 },
    ],
    player: { location: 'sietch_tabr', state: 'idle', travelTarget: null, arrivalTime: 0, influence: 12, spice: 40, troops: 6 },
    aiTimers: {},
    dialogue: null,
    events: [],
    goalAchieved: false,
    goalType: 'control_all_villages',
    factionProfiles: [],
    regions: [],
    sietches: [],
    difficulty: 'normal',
    scoutedDefense: {},
  } as unknown as WorldState
}

// ---------------------------------------------------------------------------
// migrateV1ToV2
// ---------------------------------------------------------------------------

describe('migrateV1ToV2', () => {
  it('preserves everything a v1 save already knew', () => {
    const out = migrateV1ToV2(legacyState())
    expect(out.time).toBe(120)
    expect(out.player.spice).toBe(40)
    expect(out.villages).toHaveLength(3)
    expect(out.villages[0].loyalty).toBe(70)
    expect(out.villages[2].status).toBe('rebelling')
  })

  it('marks every existing location discovered', () => {
    // A v1 player could already travel anywhere; retroactively hiding places
    // would strand them mid-run.
    const out = migrateV1ToV2(legacyState())
    expect(out.villages.every(v => v.discovered)).toBe(true)
  })

  it('infers a sensible kind per location', () => {
    const out = migrateV1ToV2(legacyState())
    const byId = Object.fromEntries(out.villages.map(v => [v.id, v.kind]))
    expect(byId.arrakeen).toBe('palace')
    expect(byId.carthag).toBe('fort')
    expect(byId.sietch_tabr).toBe('sietch')
  })

  it('recovers the exact shipped kind for every current location, not just the three whose id happens to contain "sietch"', () => {
    // habbanya_ridge and hagg are real sietches whose ids don't spell
    // "sietch" — the bug this test pins down. A fixture of only
    // sietch_tabr/arrakeen/carthag (the block above) cannot catch it: those
    // three were already covered by the old hardcoded table or its substring
    // guess. Stripping the *entire* shipped roster down to v1 shape and
    // migrating it back is what actually exercises every id, so a future
    // village added to villages.wider.ts/.farside.ts can't go unnoticed the
    // way thirteen of the current nineteen did.
    const state = legacyState()
    state.villages = INITIAL_VILLAGES.map(v => {
      const stripped: Record<string, unknown> = { ...v }
      delete stripped.kind
      delete stripped.discovered
      delete stripped.regionId
      return stripped
    }) as unknown as WorldState['villages']
    const out = migrateV1ToV2(state)
    for (const original of INITIAL_VILLAGES) {
      const migrated = out.villages.find(v => v.id === original.id)
      expect(migrated?.kind).toBe(original.kind)
    }
  })

  it('defaults regionId to the location id', () => {
    const out = migrateV1ToV2(legacyState())
    expect(out.villages.every(v => v.regionId === v.id)).toBe(true)
  })

  it('adds the pause flag as false', () => {
    expect(migrateV1ToV2(legacyState()).paused).toBe(false)
  })

  it('does not overwrite fields that already exist', () => {
    const state = legacyState()
    state.villages[0] = {
      ...state.villages[0],
      kind: 'smuggler_den',
      discovered: false,
      regionId: 'elsewhere',
    }
    const out = migrateV1ToV2(state)
    expect(out.villages[0].kind).toBe('smuggler_den')
    expect(out.villages[0].discovered).toBe(false)
    expect(out.villages[0].regionId).toBe('elsewhere')
  })

  it('is idempotent', () => {
    const once = migrateV1ToV2(legacyState())
    expect(migrateV1ToV2(once)).toEqual(once)
  })
})

// ---------------------------------------------------------------------------
// Legacy keys the consolidated schema no longer models (WP02e item 9:
// player.troops/player.influence leave WorldState that chunk, but
// migrateV1ToV2 tested below only ever ADDS/fills fields — the v4->v5 step
// that STRIPS them off old envelopes is saveMigration.v5.ts's
// migrateV4ToV5, WP02f's own migration step, exercised in
// saveMigration.v5.test.ts/saveMigration.v5.chain.test.ts. At the v1->v2
// stage tested here, an old envelope's now-unmodeled keys simply ride along
// untouched, same as any other JSON property this step doesn't recognize.)
// ---------------------------------------------------------------------------

describe('extra/dropped legacy keys survive migration untouched', () => {
  it('does not strip player.troops/player.influence off a v1 envelope', () => {
    const out = migrateV1ToV2(legacyState())
    const rawPlayer = out.player as unknown as Record<string, unknown>
    expect(rawPlayer.troops).toBe(6)
    expect(rawPlayer.influence).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// migrateSave
// ---------------------------------------------------------------------------

describe('migrateSave', () => {
  function save(overrides: Partial<VersionedSave> = {}): VersionedSave {
    return { savedAt: 1, state: legacyState(), ...overrides }
  }

  it('treats an unversioned save as v1 and upgrades it', () => {
    const out = migrateSave(save())
    expect(out).not.toBeNull()
    expect(out!.villages.every(v => v.discovered)).toBe(true)
  })

  it('returns a current-version save untouched', () => {
    const current = migrateV1ToV2(legacyState())
    const out = migrateSave(save({ version: CURRENT_SAVE_VERSION, state: current }))
    expect(out).toEqual(current)
  })

  it('refuses a save from a newer build', () => {
    // Better to start fresh than to load a world we cannot interpret.
    expect(migrateSave(save({ version: CURRENT_SAVE_VERSION + 1 }))).toBeNull()
  })

  it('refuses structurally broken saves rather than half-loading them', () => {
    expect(migrateSave(save({ state: null }))).toBeNull()
    expect(migrateSave(save({ state: 'nonsense' }))).toBeNull()
    expect(migrateSave(save({ state: {} }))).toBeNull()
    expect(migrateSave(save({ state: { villages: 'not-an-array', player: {} } }))).toBeNull()
    expect(migrateSave(save({ state: { villages: [] } }))).toBeNull()
  })

  it('accepts an empty village list on an otherwise valid save', () => {
    const out = migrateSave(save({ state: { ...legacyState(), villages: [] } }))
    expect(out).not.toBeNull()
    expect(out!.villages).toEqual([])
  })
})
