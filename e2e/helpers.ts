// e2e/helpers.ts
// Shared Playwright helpers. Split out of game.spec.ts (chunk W3b): the
// title screen now sits in front of every scenario in this suite, and
// folding the click sequence into each test file directly would have
// pushed both over the 200-line cap.

import type { Page, Response } from '@playwright/test'

/**
 * Click through the title screen's New Campaign path, assuming the page is
 * already on a loaded '/' (or '/?debug=1'). Does not navigate itself, so a
 * caller that needs the raw goto() Response (status-code assertions,
 * ?debug=1 query params) keeps that call under its own control.
 *
 * The 2s wait is the same buffer every pre-title test in this suite already
 * used after page.goto('/') — the title's own async step (newGame's
 * deleteSave IndexedDB round-trip) plus the lazily-loaded ThreeContainer
 * chunk both land inside it, so it moves here rather than disappearing.
 * Waiting on the canvas first makes that buffer additive to actual
 * readiness instead of a blind race against it.
 */
export async function enterGameFromTitle(
  page: Page,
  difficulty: 'Easy' | 'Normal' | 'Hard' = 'Normal',
): Promise<void> {
  await page.getByRole('button', { name: 'New Campaign' }).click()
  await page.getByRole('button', { name: difficulty, exact: true }).click()
  await page.getByRole('button', { name: 'Start Campaign' }).click()
  await page.locator('#scene-container canvas').waitFor({ state: 'attached' })
  await page.waitForTimeout(2000)
}

/**
 * Navigate to '/' and enter a fresh Normal campaign — the common case for
 * every test that only needs the in-game UI up and does not care about the
 * raw navigation Response.
 */
export async function enterGame(
  page: Page,
  difficulty: 'Easy' | 'Normal' | 'Hard' = 'Normal',
): Promise<Response | null> {
  const response = await page.goto('/')
  await enterGameFromTitle(page, difficulty)
  return response
}

/**
 * Clicks through both opening beats (Duke Leto's briefing, then Thufir's
 * ledger — data/dialogue/opening-briefing.ts, opening-ledger.ts) via their
 * own reply buttons, the same production click path a real player takes.
 * Assumes the briefing is already open, which every fresh campaign now is
 * (runtime/openingBriefing.ts's auto-open, chunk W3c). Regex name matches
 * rather than exact strings, so this stays correct regardless of the exact
 * punctuation/apostrophe characters authored in the copy.
 */
/**
 * Click one dialogue reply by its accessible name — via dispatchEvent, not
 * click(): a beat's final reply synchronously unmounts its own button (the
 * dialogue-event bus re-renders the panel inside the click dispatch), and
 * Playwright's post-click hit-target verification then retries against a
 * locator that can never match again — a permanent hang. Measured: the game
 * state HAD advanced while click() reported a 30s timeout.
 */
export async function chooseReply(page: Page, name: RegExp): Promise<void> {
  const btn = page.getByRole('button', { name })
  await btn.waitFor({ state: 'visible' })
  await btn.dispatchEvent('click')
}

/**
 * Click a button by its exact trimmed text (or a prefix when `exact` is
 * false) via an in-page evaluate — the same DOM handler path a human click
 * takes, executed inside the page. Used for buttons living in panels that
 * re-render on the 100ms world tick, where Playwright's locator-based
 * clicking (even dispatchEvent) intermittently loses the race against
 * production-build re-renders. Verified live: the handlers behave
 * identically under this mechanism, and the UI (e.g. the pledge confirm
 * modal) is stable for 30s+ under real clicks — the flake is the test
 * mechanism, not the app.
 */
export async function clickButton(page: Page, text: string, exact = true): Promise<void> {
  await page.waitForFunction(
    ({ t, ex }) => [...document.querySelectorAll('button')]
      .some(b => ex ? b.textContent?.trim() === t : b.textContent?.includes(t)),
    { t: text, ex: exact },
  )
  await page.evaluate(({ t, ex }) => {
    const b = [...document.querySelectorAll('button')]
      .find(x => ex ? x.textContent?.trim() === t : x.textContent?.includes(t))
    ;(b as HTMLButtonElement).click()
  }, { t: text, ex: exact })
}

/**
 * Advance the engine clock via the debug handle until the player arrives at
 * `targetId` — the "setTime for time advancement" labeled pattern (docs/
 * PRD/game-completion/progress.md Round 9's browser-trace note). Requires
 * the page to have been entered via '/?debug=1' (window.__DUNE__ only
 * attaches then). 15 game-seconds is comfortably over every opening-era
 * hop's duration (travel/rules.ts's MIN_DURATION is 4) without crossing a
 * day boundary (TimeSystem.DAY_SECONDS is 60).
 */
export async function advanceUntilArrived(page: Page, targetId: string): Promise<void> {
  const worldTime = await page.evaluate(() => window.__DUNE__?.worldTime ?? 0)
  await page.evaluate(t => window.__DUNE__?.setTime?.(t), worldTime + 15)
  await page.waitForFunction(
    id => window.__DUNE__?.player?.().location === id,
    targetId,
  )
}

export async function completeOpeningBriefing(page: Page): Promise<void> {
  const replies = [
    /understand the numbers first/i,
    /hear him out/i,
    /show me the rest/i,
    /what it becomes/i,
    /we are short/i,
    /closes it/i,
    /go earn one/i,
  ]
  for (const name of replies) {
    await chooseReply(page, name)
  }
  await page
    .getByRole('button', { name: /go earn one/i })
    .waitFor({ state: 'detached' })
}
