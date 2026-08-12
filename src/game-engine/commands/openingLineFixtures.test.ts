// src/game-engine/commands/openingLineFixtures.test.ts
// Chunk W3g: the two 03-opening-experience.md "Deterministic fixtures"
// rows that walk a full Q1 cycle — `opening-reserve-line` and
// `opening-invest-line`. Engine-level through production entry points
// (progress.md Round 11's own scope reading): the command functions, not a
// second engine of world mutation, and not the full dialogue walk either —
// settleCommand.fixtures.test.ts's reachQ1 helper is the precedent for that
// split (settleCommand.playability.test.ts is the complementary full-chain
// proof).

import { describe, it, expect, vi } from 'vitest'
import { update, initLoop } from '../GameLoop'
import { world, setWorld, createInitialState } from '../GameState'
import { runPledgeCommand } from './pledgeCommand'
import { runAssignCrewCommand } from './assignCrewCommand'
import { runSettleCommand } from './settleCommand'
import { giftPlayerSietch } from '../SietchVisitSystem'
import { pledgedCount } from '../sietch/assignTask'
import { GIFT_SPICE_COST, PLEDGE_THRESHOLD } from '../sietch/loyalty'
import { DAY_SECONDS } from '../TimeSystem'
import { BRIEFING_COMPLETE_FLAG, OPENING_COMPLETE_FLAG } from '../acts/openingObjectives'

vi.mock('../../EventBus', () => ({
  EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

function advanceToDay(day: number): void {
  world.time = day * DAY_SECONDS - 1
  update(1)
}

/** No softlock: pause.ts's settlementPending gate has cleared, so a further
 * update() genuinely advances the clock rather than sitting frozen. */
function expectClockResumes(): void {
  const timeBefore = world.time
  update(50)
  expect(world.time).toBeGreaterThan(timeBefore)
}

describe('opening-reserve-line: pledge Red Wall, harvest, keep the reserve, settle Q1 with no second pledge', () => {
  it('reaches and resolves Q1 with exactly one crew and no softlock', () => {
    const state = createInitialState()
    state.flags[BRIEFING_COMPLETE_FLAG] = true // skip Beats 1-2's dialogue — playability.test.ts covers that leg
    state.player.location = 'red_wall_sietch'
    state.sietches = state.sietches.map(s =>
      s.villageId === 'red_wall_sietch' ? { ...s, loyalty: PLEDGE_THRESHOLD } : s,
    )
    setWorld(state)
    initLoop()

    const startingSpice = world.player.spice // 60 — "keep the reserve": never spent on a gift

    expect(runPledgeCommand('red_wall_sietch')).toEqual({ ok: true, code: 'pledged' })
    expect(pledgedCount(world.sietches)).toBe(1) // no second pledge — "less capacity"

    expect(runAssignCrewCommand('group_red_wall_sietch', 'harvest', 'field_red_wall_pan'))
      .toEqual({ ok: true, code: 'assigned' })

    for (let d = 0; d <= 12; d++) advanceToDay(d)

    expect(world.pendingSettlement).not.toBeNull()
    expect(world.player.spice).toBeGreaterThanOrEqual(startingSpice) // reserve intact, harvest only adds
    // Measured (not assumed): one crew from day 0 on the denser red_wall_pan
    // field lands in the FULL band by day 12 — at or above the 90 due. Pre-
    // WP04-chunk-W4e this fixture measured 78.89 (PARTIAL) — see this
    // file's own git history and progress.md's round record. Round 1 (data/
    // troopGroups.ts's MIN_PLEDGE_CREW_SIZE 15->30 plus data/spiceFields.ts's
    // density raise) brought it to 123.97; round 2 (floor 30->40, both
    // field densities to the authored ceiling, EXTRACTION_RATE.hand 6->7 —
    // needed to clear the recovery probe, T3) raises it further to 157.33 —
    // comfortably above the 90 due, T1's own "cycle-1 FULL band reachable"
    // target. legalRange.max therefore caps at amountDue itself (90), not
    // at stock — you cannot pay more than is due.
    expect(world.pendingSettlement!.stock).toBeCloseTo(157.33, 1)
    expect(world.pendingSettlement!.legalRange.max).toBe(world.pendingSettlement!.amountDue)

    const outcome = runSettleCommand(world.pendingSettlement!.legalRange.max)

    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.ending).toBeNull() // no unrecoverable loss (03 "Recovery and refusal behavior")
    expect(world.flags[OPENING_COMPLETE_FLAG]).toBe(true)
    expectClockResumes()
  })
})

describe('opening-invest-line: pledge Red Wall, gift and pledge Tabr, both crews harvest through Q1', () => {
  it('proves the mechanics — both crews, gift cost deducted before Q1, campaign continues through settlement', () => {
    const state = createInitialState()
    state.flags[BRIEFING_COMPLETE_FLAG] = true
    state.player.location = 'red_wall_sietch'
    state.sietches = state.sietches.map(s =>
      s.villageId === 'red_wall_sietch' ? { ...s, loyalty: PLEDGE_THRESHOLD } : s,
    )
    setWorld(state)
    initLoop()

    expect(runPledgeCommand('red_wall_sietch')).toEqual({ ok: true, code: 'pledged' })
    runAssignCrewCommand('group_red_wall_sietch', 'harvest', 'field_red_wall_pan')

    world.player.location = 'sietch_tabr' // Tabr seeds at loyalty 45 (data/sietches.ts) — needs a gift
    const spiceBeforeGifts = world.player.spice
    expect(giftPlayerSietch('sietch_tabr')).toEqual({ ok: true, code: 'gifted' })
    expect(giftPlayerSietch('sietch_tabr')).toEqual({ ok: true, code: 'gifted' })
    // "Both costs visible before Q1" — the engine-level half of that: the
    // gift's cost has already left player.spice by the time of the pledge.
    expect(world.player.spice).toBe(spiceBeforeGifts - 2 * GIFT_SPICE_COST)
    const tabr = world.sietches.find(s => s.villageId === 'sietch_tabr')!
    expect(tabr.loyalty).toBeGreaterThanOrEqual(PLEDGE_THRESHOLD)

    expect(runPledgeCommand('sietch_tabr')).toEqual({ ok: true, code: 'pledged' })
    expect(pledgedCount(world.sietches)).toBe(2) // both crews
    runAssignCrewCommand('group_sietch_tabr', 'harvest', 'field_tabr_shallows')

    for (let d = 0; d <= 12; d++) advanceToDay(d)

    expect(world.pendingSettlement).not.toBeNull()
    expect(world.troopGroups).toHaveLength(2) // both crews survive to Q1
    // Measured (not assumed): both crews from day 0 (no travel time between
    // them in this engine-level fixture, unlike opening3.spec.ts's real
    // travel). Pre-WP04-chunk-W4e this measured 54.35 (PARTIAL, just above
    // the 54 minimum) — see this file's own git history and progress.md's
    // round record. Round 1's combined yield lever brought it to 136.49;
    // round 2 (see reserve line's own sibling test above for the same
    // three levers) raises it further to 214.67 — above the 90 due, the
    // FULL band. legalRange.max therefore caps at amountDue itself (90),
    // not at stock.
    expect(world.pendingSettlement!.stock).toBeCloseTo(214.67, 1)
    expect(world.pendingSettlement!.legalRange.max).toBe(world.pendingSettlement!.amountDue)

    const outcome = runSettleCommand(world.pendingSettlement!.legalRange.max)

    // NOT a "viable" claim (03 acceptance 6 is WP04's to close, per this
    // chunk's own brief) — only that the campaign continues through
    // whichever band the measured stock lands in, same as the reserve line.
    expect(outcome).toEqual({ ok: true, code: 'settled' })
    expect(world.ending).toBeNull()
    expect(world.flags[OPENING_COMPLETE_FLAG]).toBe(true)
    expectClockResumes()
  })
})
