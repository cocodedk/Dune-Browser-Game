// src/game-engine/sim/agents/recoveryProbe.test.ts
// The invariant-2 probe (07-balance-playtest-and-release.md invariant 2:
// "A player entering a tribute cycle at patience 1 has at least one visible
// legal recovery line that can survive the next two settlements when
// executed correctly"; progress.md Round 16's own W4c reading — this is
// evidence for W4d/e, not a tuning gate). Runs `recovery` from
// distressedCampaign(seed) across >=10 seeds on Normal and records how many
// survive (no ending) through the next two settlements. A low or zero
// survival count is reported as mechanics, per seed — this suite never
// tunes a balance number to make itself pass.

import { describe, it, expect } from 'vitest'
import { distressedCampaign } from './distressedCampaign'
import { runAgentCampaign } from './harness'
import { recoveryAgent } from './recovery'
import { SECOND_DEADLINE_DAY } from '../reserveLine'
import { CYCLE_DAYS } from '../../quota/quota'

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
// Two more deadlines past the fixture's own hand-off day (SECOND_DEADLINE_DAY).
const THROUGH_DAY = SECOND_DEADLINE_DAY + 2 * CYCLE_DAYS

interface ProbeRow {
  seed: number
  survived: boolean
  diedAt: 'settlement-1' | 'settlement-2' | null
  settlements: { cycleIndex: number; dueDay: number; paid: number; band: string; patienceAfter: number }[]
  endingDay: number | null
  actionCounts: Record<string, number>
}

function probe(seed: number): ProbeRow {
  const { runner } = distressedCampaign(seed)
  const result = runAgentCampaign(recoveryAgent, seed, 'normal', { runner, throughDay: THROUGH_DAY })

  const diedAt =
    result.ending === null ? null : result.settlements.length <= 1 ? 'settlement-1' : 'settlement-2'

  return {
    seed,
    survived: result.ending === null,
    diedAt,
    settlements: result.settlements.map(s => ({
      cycleIndex: s.cycleIndex, dueDay: s.dueDay, paid: s.paid, band: s.band, patienceAfter: s.patienceAfter,
    })),
    endingDay: result.ending === null ? null : result.finalDay,
    actionCounts: result.actionCounts,
  }
}

describe('invariant 2 probe: recovery from the distressed fixture, 10 seeds, Normal', () => {
  it('runs every seed without crashing and reports the reading (evidence, not a pass/fail balance gate)', () => {
    const rows = SEEDS.map(probe)
    const survivors = rows.filter(r => r.survived).length

    console.log('invariant-2 probe reading:', JSON.stringify({ survivors, of: SEEDS.length, rows }, null, 2))

    // Structural guarantees only — every seed produced a real, two-
    // settlement-or-death trace, never a silent no-op.
    for (const row of rows) {
      expect(row.settlements.length).toBeGreaterThanOrEqual(1)
      expect(row.settlements.length).toBeLessThanOrEqual(2)
    }
    expect(rows).toHaveLength(SEEDS.length)
  })
})
