// src/runtime/giftTrustBuilding.test.ts
// Chunk W2g, item 4 — the production trust-building path the opening
// depends on: sietch/loyalty.ts's own header says "Pledging is something the
// player earns through visits, gifts and dialogue," but before this chunk no
// production command could raise loyalty by gift at all (wp02-critic-verdict
// .md finding 3a; probe 4 had to write `loyalty` by hand). This proves
// Tabr — the one shipped sietch that opens below PLEDGE_THRESHOLD at loyalty
// 45 (data/sietches.ts) — can be raised and pledged with nothing but real
// bus commands and the real pledge command function.
//
// No vi.mock at all: EventBus, wireCommands, giftPlayerSietch, and
// runPledgeCommand are all the genuine production modules.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EventBus } from '../EventBus'
import { wireCommands } from './CommandWiring'
import { world, setWorld, createInitialState } from '../game-engine/GameState'
import { runPledgeCommand } from '../game-engine/commands/pledgeCommand'
import { visitPlayerSietch } from '../game-engine/SietchVisitSystem'
import { PLEDGE_THRESHOLD, GIFT_SPICE_COST, GIFT_LOYALTY_GAIN, CHARISMA_PER_PLEDGE } from '../game-engine/sietch/loyalty'

describe('gift lever: Tabr (loyalty 45) reaches pledgeable through production gift commands', () => {
  let unwire: () => void

  beforeEach(() => {
    const state = createInitialState()
    state.player.location = 'sietch_tabr'
    setWorld(state)
    unwire = wireCommands()
  })

  afterEach(() => {
    unwire()
  })

  it('two gifts across two visit cycles cross the pledge threshold, then runPledgeCommand succeeds', () => {
    const tabr = () => world.sietches.find(s => s.villageId === 'sietch_tabr')!

    expect(tabr().loyalty).toBe(45) // the shipped opening value, unmodified
    expect(runPledgeCommand('sietch_tabr')).toEqual({ ok: false, reason: 'not-loyal-enough' })

    // Visit 1: one gift. 45 + GIFT_LOYALTY_GAIN(8) = 53 — still short of 60.
    EventBus.emit('player:gift_sietch', { villageId: 'sietch_tabr' })
    expect(tabr().loyalty).toBe(45 + GIFT_LOYALTY_GAIN)
    expect(world.player.spice).toBe(60 - GIFT_SPICE_COST)
    expect(runPledgeCommand('sietch_tabr')).toEqual({ ok: false, reason: 'not-loyal-enough' })

    // Depart and return: a real second visit resets the per-visit gift
    // budget (SietchVisitSystem.visitPlayerSietch, called on travel arrival
    // in production) without touching loyalty itself.
    visitPlayerSietch('sietch_tabr')
    expect(tabr().giftedThisVisit).toBe(0)
    expect(tabr().loyalty).toBe(53)

    // Visit 2: one more gift. 53 + 8 = 61 >= PLEDGE_THRESHOLD (60).
    EventBus.emit('player:gift_sietch', { villageId: 'sietch_tabr' })
    expect(tabr().loyalty).toBe(61)
    expect(tabr().loyalty).toBeGreaterThanOrEqual(PLEDGE_THRESHOLD)
    expect(world.player.spice).toBe(60 - 2 * GIFT_SPICE_COST) // 20 spice left

    const outcome = runPledgeCommand('sietch_tabr')
    expect(outcome).toEqual({ ok: true, code: 'pledged' })
    expect(world.charisma).toBe(20 + CHARISMA_PER_PLEDGE)
    expect(world.troopGroups).toHaveLength(1)
    expect(world.troopGroups[0].id).toBe('group_sietch_tabr')
  })
})
