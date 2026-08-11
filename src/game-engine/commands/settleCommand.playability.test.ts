// src/game-engine/commands/settleCommand.playability.test.ts
// Split out of settleCommand.fixtures.test.ts (chunk W3d — that file grew
// past the 200-line cap once Beat 4's dialogue leg was added). One
// production-entry-point proof that a fresh campaign can hear the briefing,
// read the ledger, travel, earn Stilgar's trust, pledge, harvest, and reach
// and resolve Q1 — all through the same commands the UI dispatches.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import { runSettleCommand } from './settleCommand'
import { runPledgeCommand } from './pledgeCommand'
import { runAssignCrewCommand } from './assignCrewCommand'
import { startDialogue, chooseDialogue } from '../DialogueSystem'
import { BRIEFING_TREE_ID, REDWALL_TRUST_TREE_ID } from '../../data/dialogue'
import { startTravel } from '../TravelSystem'
import { DAY_SECONDS } from '../TimeSystem'
import {
  BRIEFING_COMPLETE_FLAG, LEDGER_READ_FLAG, TRAVEL_RED_WALL_FLAG, EARNED_TRUST_FLAG,
  FIRST_HARVEST_FLAG, OPENING_COMPLETE_FLAG,
} from '../acts/openingObjectives'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}

describe('playability: a fresh campaign can hear the briefing, read the ledger, travel, pledge, earn, and reach and resolve Q1 — all through production commands', () => {
  it('walks the real Duke Leto, Thufir and Stilgar trees, travels to Red Wall via Hagg, pledges, harvests, and settles', () => {
    const state = createInitialState()
    setWorld(state)
    initLoop()

    // W3c: the two dedicated opening trees, walked for real via chooseDialogue
    // (data/dialogue/opening-briefing.ts, opening-ledger.ts) — the stand-in
    // this fixture used to drive is gone. Beat 1's closing choice sets
    // briefing.complete and auto-chains straight into Beat 2
    // (DialogueSystem.ts's endDialogue); Beat 2's own closing choice sets
    // ledger.read and ends the conversation, lifting pause.ts's
    // briefingPending gate.
    startDialogue(BRIEFING_TREE_ID, 'arrakeen')
    chooseDialogue('briefing_understand')
    chooseDialogue('briefing_ack_practical_1')
    expect(world.flags[BRIEFING_COMPLETE_FLAG]).toBe(true)

    chooseDialogue('ledger_root_1')
    chooseDialogue('ledger_stock_1')
    chooseDialogue('ledger_projection_1')
    chooseDialogue('ledger_shortfall_1')
    chooseDialogue('ledger_patience_1')
    expect(world.flags[LEDGER_READ_FLAG]).toBe(true)
    expect(world.dialogue).toBeNull()

    const startingSpice = world.player.spice // 60 — the opening balance

    // Two production hops — Arrakeen and Red Wall are not directly
    // adjacent (data/regionAdjacency.ts); Hagg is the required waypoint
    // (03 "Starting contract": "only routes valid for the opening").
    startTravel('hagg')
    expect(world.player.state).toBe('traveling')
    update(10) // well over the ~6s hop
    expect(world.player.location).toBe('hagg')

    startTravel('red_wall_sietch')
    update(10) // well over the ~4s hop
    expect(world.player.location).toBe('red_wall_sietch')
    expect(world.flags[TRAVEL_RED_WALL_FLAG]).toBe(true)

    // Beat 4 (chunk W3d): TravelSystem.ts's maybeOpenRedWallTrustDialogue
    // auto-opens story/redwall_trust the instant arrival resolves — walked
    // here for real, exactly like Beats 1-2 above, BEFORE any further
    // update()/advanceToDay(): world.dialogue !== null keeps the campaign
    // clock frozen (pause.ts), so this must resolve first or every
    // following advanceToDay call would silently do nothing. Red Wall seeds
    // at loyalty 55 (data/sietches.ts) as of this chunk; either reply's +5
    // reaches PLEDGE_THRESHOLD (60) with no gift needed.
    expect(world.dialogue?.treeId).toBe(REDWALL_TRUST_TREE_ID)
    chooseDialogue('redwall_trust_transaction')
    chooseDialogue('redwall_trust_ack_transaction_1')
    expect(world.dialogue).toBeNull()

    const pledge = runPledgeCommand('red_wall_sietch')
    expect(pledge).toEqual({ ok: true, code: 'pledged' })
    expect(world.flags[EARNED_TRUST_FLAG]).toBe(true)

    const assign = runAssignCrewCommand('group_red_wall_sietch', 'harvest', 'field_red_wall_pan')
    expect(assign).toEqual({ ok: true, code: 'assigned' })
    expect(world.flags[FIRST_HARVEST_FLAG]).toBe(true)
    const crew = world.troopGroups.find(g => g.id === 'group_red_wall_sietch')
    expect(crew?.task).toBe('harvest')

    // single-harvest-authority (02 "Deterministic fixtures": "spice equals
    // the crew rule's accumulated yield; no legacy threshold payout
    // occurs"). Sum every harvest-delivery event (economy/harvestRun.ts's
    // 'Crews deliver X spice' message, the crew rule's own event) seen
    // right after each day, rather than re-reading world.events once at the
    // end — its ring buffer keeps only the last 20 and would silently drop
    // early days' events by day 12 otherwise.
    const harvestPattern = /^Crews deliver ([\d.]+) spice$/
    const seenEventIds = new Set<string>()
    let harvestedTotal = 0
    for (let d = 0; d <= 12; d++) {
      advanceToDay(d)
      for (const e of world.events) {
        if (seenEventIds.has(e.id)) continue
        seenEventIds.add(e.id)
        const match = e.message.match(harvestPattern)
        if (match) harvestedTotal += Number(match[1])
      }
    }

    expect(world.pendingSettlement).not.toBeNull()
    // pendingSettlement.stock is a snapshot of world.player.spice at the
    // moment tribute came due (quota/settlement.ts's buildPendingSettlement)
    // — taken AFTER that same day's harvest, before any settlement payment.
    // With VillageSystem's legacy village-production skim and the sietch
    // threshold payout loop both deleted (WP02e), the crew rule is the only
    // thing that could have moved player.spice between day 0 and day 12; if
    // anything else silently credited spice, this sum would fall short of
    // the snapshot.
    expect(harvestedTotal).toBeGreaterThan(0) // proves the sum actually measured something
    expect(world.pendingSettlement!.stock).toBeCloseTo(startingSpice + harvestedTotal, 0)
    const amount = world.pendingSettlement!.legalRange.max

    const outcome = runSettleCommand(amount)

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.pendingSettlement).toBeNull()
    expect(world.quota.cycleIndex).toBe(1)
    expect(world.flags[OPENING_COMPLETE_FLAG]).toBe(true)
  })
})
