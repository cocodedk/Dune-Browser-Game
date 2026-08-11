// src/game-engine/saveMigration.v3.test.ts
// migrateV2ToV3, migrateV3ToV4, and the v1->v4 migrateSave chain. Split
// from saveMigration.test.ts (v1->v2 coverage) to stay under the
// file-size limit.

import { describe, it, expect } from 'vitest'
import { migrateV2ToV3, migrateV3ToV4, migrateSave, CURRENT_SAVE_VERSION } from './saveMigration'
import type { VersionedSave } from './saveMigration'
import type { WorldState } from '../types'

/** A pre-v3 (already v2-shaped) save: no rng, still carries goalType. */
function v2State(): WorldState {
  return {
    time: 120,
    speed: 1,
    villages: [],
    player: { location: 'sietch_tabr', state: 'idle', travelTarget: null, arrivalTime: 0, influence: 12, spice: 40, troops: 6, prescience: 0 },
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
    paused: false,
    flags: {},
    quota: { nextDueDay: 12, amount: 90, cycleIndex: 0, patience: 3, arrears: 0, restoredThisAct: false },
    troopGroups: [],
    spiceFields: [],
    equipment: [],
    charisma: 20,
    act: 'act1',
    ending: null,
    ecology: [],
    forts: [],
    wormSightings: [],
    desertSites: [],
  } as unknown as WorldState
}

describe('migrateV2ToV3', () => {
  it('adds a stable, derived rng seed at step 0 to a save that has none', () => {
    const out = migrateV2ToV3(v2State())
    expect(out.rng).toEqual({ seed: expect.any(Number), step: 0 })
  })

  it('drops goalType', () => {
    const out = migrateV2ToV3(v2State())
    expect('goalType' in out).toBe(false)
  })

  it('preserves everything else the v2 save carried', () => {
    const out = migrateV2ToV3(v2State())
    expect(out.time).toBe(120)
    expect(out.player.spice).toBe(40)
    expect(out.quota.amount).toBe(90)
  })

  it('leaves an already-present rng untouched', () => {
    const withRng: WorldState = { ...v2State(), rng: { seed: 999, step: 42 } }
    const out = migrateV2ToV3(withRng)
    expect(out.rng).toEqual({ seed: 999, step: 42 })
  })

  it('derives the same seed twice from two saves with identical identity', () => {
    const a = migrateV2ToV3(v2State())
    const b = migrateV2ToV3(v2State())
    expect(a.rng.seed).toBe(b.rng.seed)
  })

  it('derives different seeds for saves with different identity', () => {
    const a = migrateV2ToV3(v2State())
    const other = v2State()
    other.player.spice = 999
    const b = migrateV2ToV3(other)
    expect(a.rng.seed).not.toBe(b.rng.seed)
  })

  it('is idempotent: migrating an already-migrated save changes nothing', () => {
    const once = migrateV2ToV3(v2State())
    expect(migrateV2ToV3(once)).toEqual(once)
  })
})

describe('migrateV3ToV4', () => {
  // The deliberate migration decision (docs/PRD/game-completion/
  // baseline/wp01-critic-verdict.md's residue item 2): a MISSING
  // lastProcessedDay backfills to the save's own current day, never to
  // `null`. `null` means "process the current day once" — backfilling a
  // real mid-run save to `null` would re-run the day it was saved on the
  // next time it crosses a boundary, reintroducing PROBE A's reload defect
  // for every old raw-world save already sitting in a real IndexedDB.
  it("backfills lastProcessedDay to the save's own current day when the field is absent", () => {
    const v3 = migrateV2ToV3(v2State()) // time: 120 -> day 2 (120 / 60)
    const out = migrateV3ToV4(v3)
    expect(out.lastProcessedDay).toBe(2)
  })

  it('never backfills to null — null stays reserved for a genuinely new campaign', () => {
    const out = migrateV3ToV4(migrateV2ToV3(v2State()))
    expect(out.lastProcessedDay).not.toBeNull()
  })

  it('leaves an already-present lastProcessedDay untouched, including an explicit null', () => {
    const withNull: WorldState = { ...migrateV2ToV3(v2State()), lastProcessedDay: null }
    expect(migrateV3ToV4(withNull).lastProcessedDay).toBeNull()

    const withValue: WorldState = { ...migrateV2ToV3(v2State()), lastProcessedDay: 99 }
    expect(migrateV3ToV4(withValue).lastProcessedDay).toBe(99)
  })

  it('is idempotent: migrating an already-migrated save changes nothing', () => {
    const once = migrateV3ToV4(migrateV2ToV3(v2State()))
    expect(migrateV3ToV4(once)).toEqual(once)
  })
})

// Extended to v5 in place (this file predates WP02f's v5 step; renaming the
// describe block rather than leaving it read "v1 -> v4" — the full step-1
// "everything survives" list and the dedicated legacy-save-migration
// fixture live in saveMigration.v5.chain.test.ts, split out to stay under
// the 200-line cap).
describe('migrateSave: v1 -> v5 chain', () => {
  function save(overrides: Partial<VersionedSave> = {}): VersionedSave {
    return { savedAt: 1, state: v2State(), ...overrides }
  }

  it('an unversioned (v1) save ends up with an rng seed, no goalType, and a backfilled lastProcessedDay', () => {
    const out = migrateSave(save())
    expect(out).not.toBeNull()
    expect(out!.rng.step).toBe(0)
    expect(typeof out!.rng.seed).toBe('number')
    expect('goalType' in out!).toBe(false)
    expect(out!.lastProcessedDay).toBe(2) // v2State().time is 120 -> day 2
  })

  it('also drops the retired troops/influence aggregate by the time it reaches v5 (v2State carries both)', () => {
    const out = migrateSave(save())
    const player = out!.player as unknown as Record<string, unknown>
    expect('troops' in player).toBe(false)
    expect('influence' in player).toBe(false)
  })

  it('a v2 save ends up with an rng seed and no goalType', () => {
    const out = migrateSave(save({ version: 2 }))
    expect(out).not.toBeNull()
    expect(out!.rng.step).toBe(0)
    expect('goalType' in out!).toBe(false)
  })

  it('is idempotent end to end: migrating the migrated save again changes nothing', () => {
    const once = migrateSave(save())!
    const twice = migrateSave({ savedAt: 1, version: CURRENT_SAVE_VERSION, state: once })
    expect(twice).toEqual(once)
  })

  it('derives the same seed across two independent migration runs of the same save', () => {
    const a = migrateSave(save())!
    const b = migrateSave(save())!
    expect(a.rng.seed).toBe(b.rng.seed)
  })
})
