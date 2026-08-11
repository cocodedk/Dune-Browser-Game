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
