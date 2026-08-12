// src/game-engine/saveMigration.v5.test.ts
// Direct unit coverage of migrateV4ToV5 — the exact drop/create/keep table
// docs/PRD/game-completion/02-runtime-consolidation.md's "Save migration"
// steps 2-5 describe. saveMigration.v5.chain.test.ts covers the full
// v1/v2 -> v5 chain (step 1's "everything else survives" list) and the
// dedicated legacy-save-migration fixture.

import { describe, it, expect } from 'vitest'
import { migrateV4ToV5 } from './saveMigration.v5'
import type { WorldState } from '../types'
import type { SietchState } from './sietch/types'

/** A v4-shaped WorldState that still carries every field v5 retires. */
function v4State(overrides: Partial<WorldState> = {}): WorldState {
  return {
    time: 600, speed: 1, villages: [],
    player: { location: 'x', state: 'idle', travelTarget: null, arrivalTime: 0, spice: 40, prescience: 0 },
    aiTimers: { harkonnen: { nextDecisionAt: 10, lastDecision: null } },
    dialogue: null, events: [], goalAchieved: false,
    factionProfiles: [], regions: [], sietches: [],
    difficulty: 'normal', scoutedDefense: {}, paused: false, flags: {},
    quota: { nextDueDay: 12, amount: 90, cycleIndex: 0, patience: 3, arrears: 0, restoredThisAct: false },
    pendingSettlement: null, troopGroups: [], spiceFields: [], equipment: [],
    charisma: 20, act: 'act1', ending: null, ecology: [], forts: [],
    wormSightings: [], desertSites: [], rng: { seed: 1, step: 0 }, lastProcessedDay: 10,
    ...overrides,
  } as unknown as WorldState
}

function pledgedLegacySietch(overrides: Partial<SietchState> = {}): SietchState {
  return {
    villageId: 'sietch_tabr', pledgedToPlayer: true, fremenWorkers: 60,
    loyalty: 70, morale: 55, lastVisitedDay: 3, giftedThisVisit: 0,
    lastMoraleVisitDay: 3, crewIds: [],
    ...overrides,
  } as unknown as SietchState
}

describe('migrateV4ToV5: drops', () => {
  it('drops player.troops and player.influence', () => {
    const legacyPlayer = { location: 'x', state: 'idle', travelTarget: null, arrivalTime: 0, spice: 40, prescience: 0, troops: 12, influence: 8 }
    const state = v4State({ player: legacyPlayer as unknown as WorldState['player'] })
    const out = migrateV4ToV5(state)
    const player = out.player as unknown as Record<string, unknown>
    expect('troops' in player).toBe(false)
    expect('influence' in player).toBe(false)
  })

  it('drops currentTask/outputProgress off every sietch, pledged or not', () => {
    const legacy = { ...pledgedLegacySietch({ villageId: 'a' }), currentTask: 'harvest_spice', outputProgress: 3 }
    const unpledged = { villageId: 'b', pledgedToPlayer: false, fremenWorkers: 10, currentTask: null, outputProgress: 0 }
    const out = migrateV4ToV5(v4State({ sietches: [legacy, unpledged] as unknown as SietchState[] }))
    for (const s of out.sietches) {
      const raw = s as unknown as Record<string, unknown>
      expect('currentTask' in raw).toBe(false)
      expect('outputProgress' in raw).toBe(false)
    }
  })

  it('resets aiTimers content (quarantined-sandbox seam, no live campaign reader)', () => {
    const out = migrateV4ToV5(v4State())
    expect(out.aiTimers).toEqual({})
  })

  it('never touches player.spice — no historical back-pay (step 3)', () => {
    const state = v4State()
    state.player = { ...state.player, spice: 77 }
    const out = migrateV4ToV5(state)
    expect(out.player.spice).toBe(77)
  })
})

describe('migrateV4ToV5: crew backfill (step 2)', () => {
  it('creates exactly one group_<villageId> crew for a pledged sietch with none', () => {
    const state = v4State({ sietches: [pledgedLegacySietch()] })
    const out = migrateV4ToV5(state)

    expect(out.troopGroups).toHaveLength(1)
    expect(out.troopGroups[0].id).toBe('group_sietch_tabr')
    // W2b's own formula (data/troopGroups.ts groupsForPledgedSietch):
    // max(MIN_PLEDGE_CREW_SIZE, round(fremenWorkers/6)). Floor raised
    // 15->30 at WP04 chunk W4e round 1, then 30->40 at round 2 — see that
    // file's own citation.
    expect(out.troopGroups[0].size).toBe(Math.max(40, Math.round(60 / 6)))
    expect(out.sietches[0].crewIds).toEqual(['group_sietch_tabr'])
  })

  it('creates no crew for an unpledged sietch', () => {
    const state = v4State({ sietches: [pledgedLegacySietch({ pledgedToPlayer: false })] })
    const out = migrateV4ToV5(state)
    expect(out.troopGroups).toHaveLength(0)
  })

  it('never duplicates a crew that already exists', () => {
    const state = v4State({
      sietches: [pledgedLegacySietch({ crewIds: ['group_sietch_tabr'] })],
      troopGroups: [{
        id: 'group_sietch_tabr', homeSietchId: 'sietch_tabr', locationId: 'sietch_tabr',
        size: 99, skills: { spice: 1, prospect: 1, military: 1, ecology: 1 },
        morale: 1, task: 'harvest', taskTargetId: 'field_x', changeoverDaysLeft: 0,
      }],
    })
    const out = migrateV4ToV5(state)
    expect(out.troopGroups).toHaveLength(1)
    expect(out.troopGroups[0].size).toBe(99) // untouched — not re-created
  })

  it('re-attaches an existing crew id to crewIds without duplicating the list entry', () => {
    const state = v4State({
      sietches: [pledgedLegacySietch({ crewIds: [] })],
      troopGroups: [{
        id: 'group_sietch_tabr', homeSietchId: 'sietch_tabr', locationId: 'sietch_tabr',
        size: 20, skills: { spice: 1, prospect: 1, military: 1, ecology: 1 },
        morale: 1, task: 'idle', taskTargetId: null, changeoverDaysLeft: 0,
      }],
    })
    const out = migrateV4ToV5(state)
    expect(out.sietches[0].crewIds).toEqual(['group_sietch_tabr'])
  })
})

describe('migrateV4ToV5: idempotent (step 7)', () => {
  it('migrating an already-migrated state changes nothing (deep-equal)', () => {
    const once = migrateV4ToV5(v4State({ sietches: [pledgedLegacySietch()] }))
    const twice = migrateV4ToV5(once)
    expect(twice).toEqual(once)
  })
})
