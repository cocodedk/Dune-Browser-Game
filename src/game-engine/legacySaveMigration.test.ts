// src/game-engine/legacySaveMigration.test.ts
// The `legacy-save-migration` row of docs/PRD/game-completion/
// 02-runtime-consolidation.md's "Deterministic fixtures" table, against the
// frozen legacySaveMigration.fixture.ts blob: "Load a pledged save
// containing both task systems" -> "One canonical crew economy, no
// duplicate income, preserved discoveries and act."

import { describe, it, expect, vi } from 'vitest'
import { migrateSave } from './saveMigration'
import { deserializeWorld } from './persistence'
import { update, initLoop } from './GameLoop'
import { world, setWorld } from './GameState'
import { DAY_SECONDS } from './TimeSystem'
import { LEGACY_PLEDGED_SAVE } from './legacySaveMigration.fixture'

vi.mock('../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}

describe('legacy-save-migration: migrateSave chain', () => {
  it('produces exactly one canonical crew for the pledged sietch, no historical spice back-pay', () => {
    const out = migrateSave(LEGACY_PLEDGED_SAVE)!
    expect(out).not.toBeNull()

    const crews = out.troopGroups.filter(g => g.id === 'group_red_wall_sietch')
    expect(crews).toHaveLength(1)
    expect(out.sietches.find(s => s.villageId === 'red_wall_sietch')?.crewIds).toEqual(['group_red_wall_sietch'])
    expect(out.player.spice).toBe(45) // unchanged — no retroactive credit for the legacy progress
  })

  it('strips goalType, troops, influence, and every sietch currentTask/outputProgress', () => {
    const out = migrateSave(LEGACY_PLEDGED_SAVE)!
    expect('goalType' in out).toBe(false)
    const player = out.player as unknown as Record<string, unknown>
    expect('troops' in player).toBe(false)
    expect('influence' in player).toBe(false)
    for (const s of out.sietches) {
      const raw = s as unknown as Record<string, unknown>
      expect('currentTask' in raw).toBe(false)
      expect('outputProgress' in raw).toBe(false)
    }
  })

  it('preserves discoveries, act, and quota', () => {
    const out = migrateSave(LEGACY_PLEDGED_SAVE)!
    expect(out.villages.find(v => v.id === 'arrakeen')?.discovered).toBe(true)
    expect(out.villages.find(v => v.id === 'sietch_tabr')?.discovered).toBe(false)
    expect(out.act).toBe('act1')
    expect(out.quota).toEqual({ nextDueDay: 12, amount: 90, cycleIndex: 0, patience: 3, arrears: 0, restoredThisAct: false })
  })
})

describe('legacy-save-migration: post-migration playability', () => {
  it('loads via deserializeWorld with spice unchanged immediately, then runs 2 production days with no throw and settlement machinery intact', () => {
    const json = JSON.stringify(LEGACY_PLEDGED_SAVE)
    const loaded = deserializeWorld(json)

    // Spice is checked here, right after load — before any day boundary
    // runs — so loyalty decay or a harvest cannot be mistaken for back-pay.
    expect(loaded.player.spice).toBe(45)
    expect(loaded.troopGroups.filter(g => g.id === 'group_red_wall_sietch')).toHaveLength(1)
    expect(loaded.factionProfiles.length).toBeGreaterThan(0) // reseeded fresh, not carried from disk

    setWorld(loaded)
    initLoop()

    expect(() => {
      advanceToDay(11)
      advanceToDay(12) // the fixture's Q1 deadline
    }).not.toThrow()

    // Settlement machinery intact: the migrated quota state still reaches
    // its deadline and creates a real pending decision — proof the
    // migrated `quota`/`pendingSettlement` shape is not just structurally
    // present but functionally live.
    expect(world.pendingSettlement).not.toBeNull()
    expect(world.pendingSettlement?.cycleIndex).toBe(0)
    expect(world.ending).toBeNull() // patience 3, first deadline — no loss yet
  })
})
