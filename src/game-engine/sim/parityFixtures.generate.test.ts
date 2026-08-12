// src/game-engine/sim/parityFixtures.generate.test.ts
// WP04 chunk W4b: writes the two parity fixtures e2e/parity.spec.ts reads —
// see parityScript.ts's own header for why generation lives here (a vitest
// test, part of `npx vitest run`) rather than inside the Playwright spec
// itself. A `.test.ts` file that writes to disk as its main job is unusual
// in this repo; the assertions below exist so a broken generator FAILS the
// unit gate instead of silently shipping an empty or stale fixture — the
// write is a side effect of proving the fixture is well-formed, not the
// other way around.

import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { generateParityFixture, type ParityFixture } from './parityScript'
import { walkToFirstCrew } from './reserveLine'
import { walkToSecondCrew } from './investLine'

const FIXTURES_DIR = fileURLToPath(new URL('../../../e2e/fixtures/', import.meta.url))

/** Fails loudly (not silently) if a fixture is degenerate — the same
 * "not vacuously true" discipline sim/runner.determinism.test.ts already
 * applies to its own hashLog length. */
function assertWellFormed(fixture: ParityFixture): void {
  expect(fixture.phaseA.length).toBeGreaterThan(10) // >= 12 day steps + several commands
  expect(fixture.phaseB.length).toBeGreaterThan(5)
  expect(fixture.trace.length).toBeGreaterThan(5)
  expect(fixture.phaseA.filter(s => s.kind === 'day').length).toBeGreaterThanOrEqual(12)
  expect(fixture.phaseB.filter(s => s.kind === 'day').length).toBeGreaterThanOrEqual(8)
}

function write(name: string, fixture: ParityFixture): void {
  mkdirSync(FIXTURES_DIR, { recursive: true })
  writeFileSync(`${FIXTURES_DIR}${name}.json`, JSON.stringify(fixture, null, 2))
}

// The fixed seed is a labeled evidence input (07-balance-playtest-and-
// release.md "Every release claim records... seed") — 31, matching
// cycleTwo.test.ts's own headless proof of the same two lines, so a reader
// comparing the two files' numbers is comparing the same campaign.
const PARITY_SEED = 31

describe('parity fixture generation (writes e2e/fixtures/*.json for e2e/parity.spec.ts)', () => {
  it('opening-reserve-line', () => {
    const fixture = generateParityFixture(PARITY_SEED, walkToFirstCrew)
    assertWellFormed(fixture)
    write('parity-reserve-line', fixture)
  })

  it('opening-invest-line', () => {
    const fixture = generateParityFixture(PARITY_SEED, rc => {
      walkToFirstCrew(rc)
      walkToSecondCrew(rc)
    })
    assertWellFormed(fixture)
    write('parity-invest-line', fixture)
  })
})
