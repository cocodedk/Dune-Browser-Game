// src/game-engine/commands/settleCommand.fixtures.test.ts
// The exact fixtures docs/PRD/game-completion/02-runtime-consolidation.md's
// "Deterministic fixtures" table names for tribute (settlement-reload) plus
// 03-opening-experience.md's opening-partial-payment/opening-short-payment
// bands, and one production-entry-point proof that a fresh campaign can
// reach and resolve Q1 through the same commands the UI dispatches.

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import { serializeWorld, deserializeWorld } from '../persistence'
import { runSettleCommand } from './settleCommand'
import { runPledgeCommand } from './pledgeCommand'
import { runAssignCrewCommand } from './assignCrewCommand'
import { startDialogue, chooseDialogue } from '../DialogueSystem'
import { BRIEFING_TREE_ID } from '../../data/dialogue'
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

function reachQ1(spice: number): void {
  const state = createInitialState()
  // pause.ts's briefingPending gate blocks processDayBoundary() until
  // briefing.complete is set — irrelevant to what these three fixtures
  // test (the settlement bands themselves), so it's set directly rather
  // than by walking the real Duke Leto tree. The playability fixture below
  // drives the real tree instead, since that IS part of what it proves.
  state.flags[BRIEFING_COMPLETE_FLAG] = true
  state.player.spice = spice
  setWorld(state)
  initLoop()
  for (let d = 0; d <= 12; d++) advanceToDay(d) // FIRST_DEADLINE_DAY
}

describe('settlement-reload: same decision survives a save/load round trip', () => {
  it('carries identical amount/options, settles exactly once, and refuses a second settle', () => {
    reachQ1(60)
    expect(world.pendingSettlement).not.toBeNull()
    const beforeReload = world.pendingSettlement

    const reloaded = deserializeWorld(serializeWorld(world))

    expect(reloaded.pendingSettlement).toEqual(beforeReload)
    setWorld(reloaded)

    const outcome = runSettleCommand(60)
    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.pendingSettlement).toBeNull()
    expect(world.quota.cycleIndex).toBe(1)
    const nextDeadline = world.quota.nextDueDay

    const second = runSettleCommand(1)
    expect(second).toEqual({ ok: false, reason: 'no-pending-settlement' })
    expect(world.quota.cycleIndex).toBe(1) // unchanged — one settlement, one next deadline
    expect(world.quota.nextDueDay).toBe(nextDeadline)
  })
})

describe('opening-partial-payment: paying exactly the minimum partial threshold', () => {
  it('holds patience, carries 45 arrears after the surcharge, and advances the deadline', () => {
    reachQ1(60) // due 90; minPartialPayment = round(90 * 0.6) = 54
    const patienceBefore = world.quota.patience

    const outcome = runSettleCommand(54)

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.quota.patience).toBe(patienceBefore) // held, not restored (not full) or lost
    expect(world.quota.arrears).toBe(45) // round((90-54) * 1.25)
    expect(world.quota.nextDueDay).toBe(12 + 8)
    expect(world.ending).toBeNull()
    expect(world.flags[OPENING_COMPLETE_FLAG]).toBe(true) // any band closes the opening (03 "Beat 7")
  })
})

describe('opening-short-payment: reaching day 12 below the minimum partial threshold', () => {
  it('applies once, loses one patience, carries the full shortfall, and the campaign continues', () => {
    reachQ1(30) // below 54 — the fixture's own legal range caps at 30
    expect(world.pendingSettlement?.legalRange.max).toBe(30)
    const patienceBefore = world.quota.patience

    const outcome = runSettleCommand(30)

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.quota.patience).toBe(patienceBefore - 1)
    expect(world.quota.arrears).toBe(60) // 90 - 30, no surcharge below the partial band
    expect(world.ending).toBeNull() // patience started at 3; one loss does not end the run
    expect(world.player.spice).toBe(0)
    expect(world.flags[OPENING_COMPLETE_FLAG]).toBe(true) // short still closes the opening
  })
})

describe('playability: a fresh campaign can hear the briefing, read the ledger, travel, pledge, earn, and reach and resolve Q1 — all through production commands', () => {
  it('walks the real Duke Leto and Thufir trees at Arrakeen, travels to Red Wall via Hagg, pledges, harvests, and settles', () => {
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

    const pledge = runPledgeCommand('red_wall_sietch') // loyalty 80 at opening — no gift/dialogue setup needed
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
