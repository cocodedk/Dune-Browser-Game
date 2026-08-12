// src/game-engine/saveMigration.v5.chain.test.ts
// The full v1/v2 -> v5 chain, proving 02's "Save migration" step 1 list
// ("Preserve discovered locations, dialogue flags, equipment, fields,
// forts, ecology, current time, quota, act, and any valid ending") plus
// rng/lastProcessedDay/pendingSettlement survive migrateSave end to end,
// including through a save that reaches v5 with a non-null ending already
// recorded. Split from saveMigration.v3.test.ts to stay under the 200-line
// cap — that file keeps its own narrower v1->v5 smoke checks.

import { describe, it, expect } from 'vitest'
import { migrateSave, CURRENT_SAVE_VERSION } from './saveMigration'
import type { WorldState } from '../types'

/** A rich pre-v3 (v2-shaped) save exercising every step-1 "must survive" field. */
function richV2State(): WorldState {
  return {
    time: 777,
    speed: 1,
    villages: [
      { id: 'arrakeen', name: 'Arrakeen', position: { x: 1, y: 1 }, population: 800, spice: 9, loyalty: 40, owner: 'harkonnen', status: 'neutral', productionRate: 2, kind: 'palace', discovered: true, regionId: 'arrakeen' },
      { id: 'sietch_tabr', name: 'Sietch Tabr', position: { x: 2, y: 2 }, population: 450, spice: 3, loyalty: 45, owner: 'fremen', status: 'friendly', productionRate: 1, kind: 'sietch', discovered: false, regionId: 'sietch_tabr' },
    ],
    player: { location: 'arrakeen', state: 'idle', travelTarget: null, arrivalTime: 0, spice: 50, prescience: 2 },
    aiTimers: {},
    dialogue: null,
    events: [],
    goalAchieved: false,
    factionProfiles: [],
    regions: [],
    sietches: [],
    difficulty: 'normal',
    scoutedDefense: {},
    paused: false,
    flags: { act: 2, 'beat.duke_revelation': true, 'taught.water_of_life': 1 },
    quota: { nextDueDay: 20, amount: 130, cycleIndex: 1, patience: 2, arrears: 12, restoredThisAct: true },
    pendingSettlement: {
      cycleIndex: 1, dueDay: 20, amountDue: 130, stock: 50,
      minPartialPayment: 78, arrearsSurchargeRate: 0.25, legalRange: { min: 0, max: 50 },
    },
    troopGroups: [],
    spiceFields: [{ id: 'field_1', regionId: 'arrakeen', position: { x: 3, y: 3 }, discovered: true, density: 60, capacity: 500, remaining: 300 }],
    equipment: [{ id: 'equip_1', kind: 'harvester', locationId: 'arrakeen', groupId: null, condition: 100 }],
    charisma: 35,
    act: 'act2',
    ending: 'win_military',
    ecology: [{ regionId: 'arrakeen', vegetation: 15, windtraps: 2 }],
    forts: [{ locationId: 'carthag', strength: 400, isCapital: true, destroyed: false }],
    wormSightings: [{ fieldId: 'field_1', atTime: 400 }],
    desertSites: [{ id: 'site_1', kind: 'spice_blow', latitude: 1, longitude: 1, distanceDays: 2, discovered: true }],
  } as unknown as WorldState
}

describe('migrateSave: v1/v2 -> v5 preserves everything step 1 lists', () => {
  it('preserves discoveries, flags, equipment, fields, forts, ecology, time, quota, act, and a valid ending', () => {
    const out = migrateSave({ savedAt: 1, version: 2, state: richV2State() })!
    expect(out).not.toBeNull()

    expect(out.villages.find(v => v.id === 'arrakeen')?.discovered).toBe(true)
    expect(out.villages.find(v => v.id === 'sietch_tabr')?.discovered).toBe(false)
    expect(out.flags).toEqual({ act: 2, 'beat.duke_revelation': true, 'taught.water_of_life': 1 })
    expect(out.equipment).toEqual(richV2State().equipment)
    expect(out.spiceFields).toEqual(richV2State().spiceFields)
    expect(out.forts).toEqual(richV2State().forts)
    expect(out.ecology).toEqual(richV2State().ecology)
    expect(out.time).toBe(777)
    expect(out.quota).toEqual({ nextDueDay: 20, amount: 130, cycleIndex: 1, patience: 2, arrears: 12, restoredThisAct: true })
    expect(out.act).toBe('act2')
    expect(out.ending).toBe('win_military') // a valid (non-null) ending survives
  })

  it('preserves rng, lastProcessedDay, and pendingSettlement', () => {
    const out = migrateSave({ savedAt: 1, version: 2, state: richV2State() })!
    expect(out.rng).toEqual({ seed: expect.any(Number), step: 0 })
    expect(out.lastProcessedDay).toBe(12) // 777 / 60 floored
    expect(out.pendingSettlement).toEqual(richV2State().pendingSettlement)
  })

  it('is idempotent end to end at v5: re-migrating the v5 output changes nothing', () => {
    const once = migrateSave({ savedAt: 1, version: 2, state: richV2State() })!
    const twice = migrateSave({ savedAt: 1, version: CURRENT_SAVE_VERSION, state: once })
    expect(twice).toEqual(once)
  })

  it('CURRENT_SAVE_VERSION is 5, the version this chain lands on', () => {
    expect(CURRENT_SAVE_VERSION).toBe(5)
  })
})
