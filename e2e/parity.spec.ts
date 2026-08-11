import { test, expect } from '@playwright/test'
import { loadFixture, driveSteps, enterAtSeed, establishParitySync, reloadAndContinue } from './parityDriver'
import { FIRST_DEADLINE_DAY } from '../src/game-engine/quota/quota'

// docs/PRD/game-completion/07-balance-playtest-and-release.md "Determinism
// and parity"; progress.md Round 16, WP04 chunk W4b — the browser/headless
// state-hash parity fixtures: opening-reserve-line and opening-invest-line,
// each through cycle-2 settlement with a reload checkpoint at the cycle-1
// pending-settlement decision. quota.ts has no imports of its own (a pure
// module), so FIRST_DEADLINE_DAY is safe to import directly here — unlike
// TimeSystem.ts/GameState.ts, it never reaches the regions.json blocker
// parityDriver.ts's own header documents.
//
// The two fixture JSON files this spec reads are written by
// src/game-engine/sim/parityFixtures.generate.test.ts, which runs as part
// of `npx vitest run` — first in every gate sequence this project's release
// protocol runs, ahead of `npx playwright test` — so the expectations here
// are always regenerated in the same commit, never hand-edited or stale.

async function runParityLine(page: import('@playwright/test').Page, fixtureName: string): Promise<void> {
  const fixture = loadFixture(fixtureName)
  await enterAtSeed(page, fixture.seed)

  const entryHash = await establishParitySync(page, 0)
  expect(entryHash, 'campaign-entry parity mismatch, before any command').toBe(fixture.entryParityHash)

  await driveSteps(page, fixture.phaseA, fixture.trace)

  await reloadAndContinue(page)
  const postReloadHash = await establishParitySync(page, FIRST_DEADLINE_DAY * 60)
  expect(postReloadHash, 'reload changed state that should have been byte-identical').toBe(fixture.preReloadParityHash)

  await driveSteps(page, fixture.phaseB, fixture.trace)
}

test('opening-reserve-line: browser/headless parity through cycle-2, with a reload checkpoint', async ({ page }) => {
  await runParityLine(page, 'parity-reserve-line')
})

test('opening-invest-line: browser/headless parity through cycle-2, with a reload checkpoint', async ({ page }) => {
  await runParityLine(page, 'parity-invest-line')
})
