import { test, expect } from '@playwright/test'
import { chooseReply, enterGameFromTitle, completeOpeningBriefing, advanceUntilArrived } from './helpers'

// Chunk W3g: browser scenario #5, first half (03-opening-experience.md
// "Browser scenarios" — "Reload during flight"). Requires item 2a's new
// travel-start autosave (commandHandlers.ts's onTravel) — before this
// chunk, no production path saved anything at travel start, so a reload
// mid-flight had nothing to restore but a stale pre-travel save.
//
// Scenario #5's second half ("reload during pending settlement") already
// exists as opening4.spec.ts's own settlement-reload test — cited there,
// not duplicated here.
test('reload during flight restores the same travel, and the flight completes normally', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)

  // First leg: Arrakeen -> Hagg, via the destination list's real button
  // (reachFirstCrew's own established first step — e2e/helpers.ts).
  await chooseReply(page, /Hagg/)
  await expect.poll(() => page.evaluate(() => window.__DUNE__?.player?.().state)).toBe('traveling')
  const travelTargetBefore = await page.evaluate(() => window.__DUNE__?.player?.().travelTarget)
  expect(travelTargetBefore).toBe('hagg')

  // The travel-start autosave (commandHandlers.ts's onTravel) is
  // fire-and-forget IndexedDB I/O — give it time to land before reloading,
  // the same 500ms buffer opening4.spec.ts's settlement-reload test uses.
  await page.waitForTimeout(500)

  await page.reload()
  await expect(page.getByRole('button', { name: /^Continue/ })).toBeVisible()
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.locator('#scene-container canvas').waitFor({ state: 'attached' })
  await page.waitForTimeout(1000)

  // Not a byte-identical hash: the clock keeps running during flight, unlike
  // a paused settlement decision, so an exact snapshot comparison would be
  // the wrong proof here. What must survive is the travel itself — still
  // traveling, to the same target, not duplicated or reset.
  const restored = await page.evaluate(() => window.__DUNE__?.player?.())
  expect(restored?.state).toBe('traveling')
  expect(restored?.travelTarget).toBe('hagg')

  // The flight completes normally from the restored state.
  await advanceUntilArrived(page, 'hagg')
})
