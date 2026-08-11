// src/game-engine/acts/openingObjectives.test.ts
// Pure-query coverage for the opening's seven-step objective chain. Flags
// are set directly here (not through the production commands that write
// them) to isolate the query logic — commands/*.fixtures.test.ts and
// briefingGate.test.ts prove the production writers themselves.

import { describe, it, expect } from 'vitest'
import { createInitialState } from '../GameState'
import {
  activeOpeningObjective, completedOpeningObjectives, openingObjectiveChain, ledgerDisclosed,
  BRIEFING_COMPLETE_FLAG, LEDGER_READ_FLAG, TRAVEL_RED_WALL_FLAG,
  EARNED_TRUST_FLAG, FIRST_HARVEST_FLAG, OPENING_COMPLETE_FLAG,
} from './openingObjectives'

describe('openingObjectiveChain: seven stable ids, in order, every time', () => {
  it('is not affected by any flag state', () => {
    const ids = openingObjectiveChain(createInitialState()).map(r => r.id)
    expect(ids).toEqual([
      'act1.receive_briefing', 'act1.read_ledger', 'act1.travel_red_wall',
      'act1.earn_trust', 'act1.order_first_harvest', 'act1.prepare_q1',
      'opening.complete',
    ])
  })
})

describe('activeOpeningObjective: derives from flags, no seed write needed', () => {
  it('starts at act1.receive_briefing on a fresh campaign with no flags at all', () => {
    const world = createInitialState()
    expect(activeOpeningObjective(world)?.id).toBe('act1.receive_briefing')
    expect(completedOpeningObjectives(world)).toEqual([])
  })

  it('advances one step per flag, through the full chain, in order', () => {
    const world = createInitialState()

    world.flags[BRIEFING_COMPLETE_FLAG] = true
    expect(activeOpeningObjective(world)?.id).toBe('act1.read_ledger')

    world.flags[LEDGER_READ_FLAG] = true
    expect(activeOpeningObjective(world)?.id).toBe('act1.travel_red_wall')

    world.flags[TRAVEL_RED_WALL_FLAG] = true
    expect(activeOpeningObjective(world)?.id).toBe('act1.earn_trust')

    world.flags[EARNED_TRUST_FLAG] = true
    expect(activeOpeningObjective(world)?.id).toBe('act1.order_first_harvest')

    world.flags[FIRST_HARVEST_FLAG] = true
    expect(activeOpeningObjective(world)?.id).toBe('act1.prepare_q1')

    world.flags['quota.cycle'] = 1
    expect(activeOpeningObjective(world)?.id).toBe('opening.complete')

    world.flags[OPENING_COMPLETE_FLAG] = true
    expect(activeOpeningObjective(world)).toBeNull()

    expect(completedOpeningObjectives(world).map(r => r.id)).toEqual([
      'act1.receive_briefing', 'act1.read_ledger', 'act1.travel_red_wall',
      'act1.earn_trust', 'act1.order_first_harvest', 'act1.prepare_q1',
      'opening.complete',
    ])
  })

  it('prepare_q1 completes on any settled band (quota.cycle >= 1), not only full payment', () => {
    const world = createInitialState()
    world.flags['quota.cycle'] = 3 // a later, short-paid cycle still counts
    expect(activeOpeningObjective(world)?.id).not.toBe('act1.prepare_q1')
  })
})

describe('progress: only prepare_q1 carries numeric progress', () => {
  it('is null for every other step', () => {
    const world = createInitialState()
    const chain = openingObjectiveChain(world)
    for (const r of chain) {
      if (r.id === 'act1.prepare_q1') continue
      expect(r.progress).toBeNull()
    }
  })

  it('reads current spice against the full amount due for prepare_q1', () => {
    const world = createInitialState()
    world.player.spice = 60
    const record = openingObjectiveChain(world).find(r => r.id === 'act1.prepare_q1')!
    expect(record.progress).toEqual({ current: 60, target: 90 })
  })
})

describe('targetHint: location ids the pick store can select, panel keys as text', () => {
  it('maps each step to a discriminated hint', () => {
    const chain = openingObjectiveChain(createInitialState())
    const byId = Object.fromEntries(chain.map(r => [r.id, r.targetHint]))

    expect(byId['act1.receive_briefing']).toEqual({ kind: 'location', id: 'arrakeen' })
    expect(byId['act1.travel_red_wall']).toEqual({ kind: 'location', id: 'red_wall_sietch' })
    expect(byId['act1.earn_trust']).toEqual({ kind: 'location', id: 'red_wall_sietch' })
    expect(byId['act1.read_ledger']).toEqual({ kind: 'panel', key: 'quota-ledger' })
    expect(byId['act1.order_first_harvest']).toEqual({ kind: 'panel', key: 'crew-panel' })
  })
})

describe('ledgerDisclosed: QuotaLedger mounts on ledger.read, or for any pre-existing save', () => {
  it('is false for a fresh campaign mid-beats — no flag, no day boundary crossed yet', () => {
    const world = createInitialState()
    expect(ledgerDisclosed(world)).toBe(false)
  })

  it('is true once ledger.read is set, regardless of lastProcessedDay', () => {
    const world = createInitialState()
    world.flags[LEDGER_READ_FLAG] = true
    expect(ledgerDisclosed(world)).toBe(true)
  })

  it('is true for a pre-W3c save — a day boundary already crossed, ledger.read never set', () => {
    const world = createInitialState()
    world.lastProcessedDay = 5 // simulates a save that predates the opening's pause gate
    expect(ledgerDisclosed(world)).toBe(true)
  })
})
