// e2e/parityDriver.ts
// WP04 chunk W4b's browser-side half of the parity harness. Reads the JSON
// fixtures src/game-engine/sim/parityFixtures.generate.test.ts writes (see
// its own header for why generation cannot happen inside this Playwright
// process directly — a real, measured import-graph blocker, not a
// preference) and drives window.__DUNE__ to reproduce the identical script,
// comparing state/parityView.ts's parityHash at every point the headless
// side already recorded one.
//
// A whole phase is driven inside ONE page.evaluate call (driveSteps below),
// not one call per step. This closes a real, measured divergence: the
// ambient GameDriver render loop is still running on the page throughout —
// production code this harness must not touch — and runtimeTick.ts's own
// auto-open hooks (maybeOpenQ1Debrief etc.) fire on EVERY frame regardless
// of world.paused (only the clock advance itself is pause-gated; the hooks
// are deliberately unconditional, per runtimeTick.ts's own doc, so a
// genuinely-paused briefing/debrief can still auto-open). Measured failure:
// between two SEPARATE evaluate calls (settle, then the tick that should
// open the debrief), an ambient frame's own hook call could open the
// debrief dialogue FIRST, at the wrong world.time — then this driver's own
// deliberate advanceTo found `inDialogue` already true and pause.ts blocked
// the clock, leaving world.time one second short of the headless value.
// Intermittent (a real frame-timing race, not deterministic), which is why
// it did not show on every run. Running a whole phase as one synchronous
// browser-side loop admits no frame between any two of this driver's own
// steps, closing the race at its root rather than papering over one symptom.
//
// DAY_SECONDS is hand-pinned to 60 rather than imported from
// game-engine/TimeSystem.ts: that module imports GameState.ts, which pulls
// in the same regions.json import-attribute blocker parityScript.ts's own
// header documents — this file, unlike the fixtures, DOES need to run
// inside Playwright's own loader. TimeSystem.ts's own `DAY_SECONDS = 60` is
// the source of truth; this is a citation, not a second definition a future
// balance change could silently drift from unnoticed — sim/trace.ts's
// HashStep doc says explicitly which kinds need this multiplication.

import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { enterGameFromTitle } from './helpers'

/** game-engine/TimeSystem.ts's own constant — see this file's header. */
const DAY_SECONDS = 60

export interface HashStep {
  kind: 'command' | 'day' | 'arrival' | 'tick'
  ref: number
  hash: string
  parityHash: string
}

export interface ParityFixture {
  seed: number
  entryParityHash: string
  phaseA: HashStep[]
  preReloadParityHash: string
  phaseB: HashStep[]
  trace: [string, unknown][]
}

export function loadFixture(name: string): ParityFixture {
  const path = fileURLToPath(new URL(`./fixtures/${name}.json`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf-8')) as ParityFixture
}

/**
 * Replays every step in order, inside ONE synchronous browser-side loop
 * (this file's own header explains why), then compares the returned
 * per-step parityHash array against the headless expectations back in
 * Node. First divergence throws — caught by Playwright as the test failure
 * — with the diverging step, the step immediately before it, and a live
 * browser state summary (07-balance-playtest-and-release.md "Determinism
 * and parity": "reports the preceding command, both state summaries, and
 * the differing paths").
 */
export async function driveSteps(page: Page, steps: HashStep[], trace: ParityFixture['trace']): Promise<void> {
  const hashes = await page.evaluate(
    ({ steps, trace, daySeconds }) => steps.map(step => {
      if (step.kind === 'command') return window.__DUNE__?.replay?.(trace[step.ref])
      const target = step.kind === 'day' ? step.ref * daySeconds : step.ref
      return window.__DUNE__?.advanceTo?.(target)
    }),
    { steps, trace, daySeconds: DAY_SECONDS },
  )

  let previous: HashStep | 'campaign entry' = 'campaign entry'
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (hashes[i] !== step.parityHash) {
      const browserSummary = await page.evaluate(() => window.__DUNE__?.player?.())
      throw new Error(
        `parity divergence.\n  preceding step: ${JSON.stringify(previous)}\n` +
        `  diverging step: ${JSON.stringify(step)}\n` +
        `  headless parityHash: ${step.parityHash}\n  browser   parityHash: ${String(hashes[i])}\n` +
        `  browser player() summary: ${JSON.stringify(browserSummary)}`,
      )
    }
    previous = step
  }
}

export async function enterAtSeed(page: Page, seed: number): Promise<void> {
  await page.goto(`/?debug=1&seed=${seed}`)
  await enterGameFromTitle(page)
}

/**
 * Pauses the ambient loop and raw-sets `world.time` to `targetSeconds`
 * before reading parityHash — one atomic evaluate, so no ambient frame can
 * land between the reset and the snapshot (debugSources.ts's own doc on
 * `pauseForParity`/`advanceTo` explains why this exact ordering is
 * required). Used at campaign entry (target 0) and immediately after a
 * reload (target = the reload checkpoint's own day-quantum second).
 */
export async function establishParitySync(page: Page, targetSeconds: number): Promise<string | undefined> {
  return page.evaluate(t => {
    window.__DUNE__?.pauseForParity?.()
    window.__DUNE__?.setTime?.(t)
    return window.__DUNE__?.parityHash?.()
  }, targetSeconds)
}

/**
 * The browser half of the reload checkpoint (07's protocol item 4): a real
 * page reload, then the title's own Continue button — the production
 * save/load path, e2e/opening6.spec.ts's own proven sequence. The wait
 * before reloading lets the settlement-pending autosave's fire-and-forget
 * IndexedDB write (runtime/pendingSettlementAutosave.ts) land first —
 * opening6.spec.ts's own race-invariant note explains why the FLAG this
 * driver depends on (pendingSettlement existing at all) is synchronous, but
 * the actual disk write is not.
 */
export async function reloadAndContinue(page: Page): Promise<void> {
  // Deterministic durability wait, not a blind timeout: the autosave's
  // IndexedDB write is fire-and-forget, and under full-suite load a 500ms
  // guess lost the race — the reloaded title then had no Continue button at
  // all (measured: passed 6/6 standalone, failed inside the commit gate's
  // run). Poll the actual save row instead.
  await page.waitForFunction(() => new Promise<boolean>(resolve => {
    const req = indexedDB.open('dune-browser-game')
    req.onsuccess = () => {
      const db = req.result
      try {
        const get = db.transaction('world-state', 'readonly')
          .objectStore('world-state').get('current')
        get.onsuccess = () => { db.close(); resolve(!!get.result) }
        get.onerror = () => { db.close(); resolve(false) }
      } catch { db.close(); resolve(false) }
    }
    req.onerror = () => resolve(false)
  }))
  await page.reload()
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.locator('#scene-container canvas').waitFor({ state: 'attached' })
  await page.waitForTimeout(1000)
}
