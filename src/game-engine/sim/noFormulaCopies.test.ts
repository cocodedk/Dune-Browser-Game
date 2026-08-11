// src/game-engine/sim/noFormulaCopies.test.ts
// Structural enforcement of 07-balance-playtest-and-release.md's may-not
// list: "Copy yield, cost, relationship, tribute, raid, or victory
// formulas." A full lint-level import-graph guard is overkill for one small
// directory (Round 16's own reading) — grepping sim/'s own source for the
// exact formula-internal calls balance/simulate.ts used to reimplement the
// day loop with is cheap and honest: every name below is a low-level rule
// function sim/ has no reason to call directly, because it already has a
// composed, production query for the same information (visibleState.ts's
// own `projection` field wraps projectIncome, which itself wraps
// harvestYield — sim/ calls the wrapper, never the formula underneath).
// `totalDue` is deliberately NOT in this list: QuotaLedger.tsx calls it
// directly too (it is the due-amount READ, not a formula), and visibleState
// .ts mirrors that same call.

import { describe, it, expect } from 'vitest'

/** Formula-internal calls balance/simulate.ts used to reimplement directly
 * (troops/harvest.ts, troops/types.ts, quota/quota.ts, sietch/morale.ts). */
const FORBIDDEN_CALLS = [
  'harvestYield(', 'effectiveDensity(', 'settleQuota(', 'moraleMultiplier(', 'baseAmountForCycle(',
]

/** Every sim/ source file, as text — import.meta.glob rather than node:fs
 * (no @types/node in this project; prescienceCallers.test.ts and
 * flagCoverage.test.ts are the established precedent for this pattern).
 * `**` recurses into sim/agents/ (WP04 chunk W4c) — the original one-level
 * glob left the strategy agents and their harness unscanned, a blind spot
 * this guard is supposed to close, not carry. */
function simSources(): Record<string, string> {
  const files = import.meta.glob('/src/game-engine/sim/**/*.ts', {
    query: '?raw', import: 'default', eager: true,
  }) as Record<string, string>
  return Object.fromEntries(
    Object.entries(files).filter(([path]) => !path.endsWith('/noFormulaCopies.test.ts')),
  )
}

describe('sim/ imports production formulas, never reimplements them', () => {
  const sources = simSources()
  const files = Object.keys(sources)

  it('sees more than one sim/ source file (a passing suite must not be vacuous)', () => {
    expect(files.length).toBeGreaterThan(1)
  })

  it.each(files)('%s contains none of the forbidden formula-internal calls', file => {
    const text = sources[file]
    for (const token of FORBIDDEN_CALLS) {
      expect(text.includes(token), `${file} contains forbidden call ${token}`).toBe(false)
    }
  })
})
