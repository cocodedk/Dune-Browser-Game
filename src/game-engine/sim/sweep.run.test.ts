// src/game-engine/sim/sweep.run.test.ts
// The published seed sweep's execution entry point (07-balance-playtest-
// and-release.md "Seed sweep"; WP04 chunk W4d). Vite-less node cannot
// import the TS engine directly, so this file is the honest same-code path:
// a vitest test IS how sweep.ts's runSweep() reaches the real production
// engine, exactly like every other sim/ test already does. Guarded behind
// RUN_SWEEP so `npx vitest run` (the default gate) stays fast — this test
// does no work at all, module-level or otherwise, unless the env var is
// set; scripts/run-seed-sweep.mjs is the process that sets it.
//
// Run directly: RUN_SWEEP=1 npx vitest run src/game-engine/sim/sweep.run.test.ts --reporter=default
// (vitest 4's reporter list is default/agent/blob/verbose/dot/json/tap/
// tap-flat/junit/tree/hanging-process/github-actions — no "basic"; `default`
// is this version's own closest match to that name.)

import { describe, it, expect } from 'vitest'
import { runSweep } from './sweep'

const RUN_SWEEP = process.env.RUN_SWEEP === '1'
// Generous relative to the ~15-minute runtime budget (07's own release-
// sweep note; this chunk's task item 6) — a real timeout should trip on a
// genuine hang, not on ordinary sweep-scale variance.
const SWEEP_TIMEOUT_MS = 25 * 60 * 1000

describe('WP04 chunk W4d: published seed sweep (RUN_SWEEP=1 only)', () => {
  it.skipIf(!RUN_SWEEP)('runs every published seed x config and writes the committed report', () => {
    const commit = process.env.SWEEP_COMMIT ?? 'unknown'
    const result = runSweep({ commit })

    // Not vacuous: a genuinely populated sweep, not an empty pass.
    expect(result.runs.length).toBeGreaterThan(0)
    expect(result.seedCount).toBeGreaterThanOrEqual(1)
    expect(result.configCount).toBe(13)
    expect(result.runs.length).toBe(result.seedCount * result.configCount)
    expect(result.determinismAudit.length).toBeGreaterThan(0)
    for (const row of result.determinismAudit) {
      expect(row.matchHash).toBe(true)
      expect(row.matchParityHash).toBe(true)
    }

    console.log(`sweep wall clock: ${(result.wallClockMs / 1000).toFixed(1)}s for ${result.runs.length} runs`)
  }, SWEEP_TIMEOUT_MS)
})
