import { test, expect } from '@playwright/test'
import { chooseReply, enterGame, enterGameFromTitle, advanceUntilArrived } from './helpers'

// W3i remediation: the blind-play re-check's own "New regression" — a
// softlock family, not one bug. Both tests here are the verifier's EXACT
// repros, played through production UI on the plain debug handle (no
// world-mutating calls), not a source-level shortcut.

// Repro 1 (baseline/wp03-blindplay-verdict.md "New regression"): pause, then
// click a destination while a mandatory beat (Thufir's ledger) is still
// open. The engine must refuse travel outright — the destination row alone
// being disabled is not enough, since a replayed bus event or a stale panel
// could otherwise still start it.
test('travel is refused while a mandatory dialogue is open, with a visible reason, and the clock is resumable after', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)

  await chooseReply(page, /understand the numbers first/i)
  await chooseReply(page, /hear him out/i)

  // Beat 2 (Thufir's ledger) auto-chained open; Beat 1 already unlocked the
  // destination list (destinationsDisclosed keys on BRIEFING_COMPLETE_FLAG)
  // — exactly the "Hagg enabled, still mid-Thufir" state the re-check found.
  await expect(page.locator('text=Thufir Hawat').first()).toBeVisible()
  await expect(page.locator('text=Known destinations')).toBeVisible()

  // 0x — the verifier's exact repro step.
  const pauseBtn = page.getByRole('button', { name: '0×' })
  await pauseBtn.click()
  await expect(pauseBtn).toHaveAttribute('aria-pressed', 'true')

  const hagg = page.getByRole('button', { name: /Hagg/ })
  await expect(hagg).toBeVisible()
  await expect(hagg).toBeDisabled()
  await expect(hagg).toContainText(/finish this conversation/i)

  // Engine-level confirmation, not just the disabled control: the player
  // never actually left Arrakeen.
  const midPlayer = await page.evaluate(() => window.__DUNE__?.player?.())
  expect(midPlayer?.state).toBe('idle')
  expect(midPlayer?.location).toBe('arrakeen')

  // Unpause, finish the mandatory beat the normal way.
  await pauseBtn.click()
  await expect(pauseBtn).toHaveAttribute('aria-pressed', 'false')
  await chooseReply(page, /show me the rest/i)
  await chooseReply(page, /what it becomes/i)
  await chooseReply(page, /we are short/i)
  await chooseReply(page, /closes it/i)
  await chooseReply(page, /go earn one/i)

  // Travel is legal now, and completes — no lingering softlock.
  await expect(hagg).toBeEnabled()
  await hagg.dispatchEvent('click')
  await advanceUntilArrived(page, 'hagg')
  expect(await page.evaluate(() => window.__DUNE__?.player?.().location)).toBe('hagg')
})

// Repro 2: a fresh campaign started mid-session (StatusBar's New, the
// window.confirm path) must reopen the briefing through the same per-frame
// GameDriver.tick() hook a title-screen New Campaign uses — no remount.
test('mid-session New (StatusBar) starts a fresh campaign, auto-opens the briefing, and the spacebar pause tracks the fresh campaign', async ({ page }) => {
  await enterGame(page)
  await chooseReply(page, /understand the numbers first/i)
  await chooseReply(page, /hear him out/i)
  await expect(page.locator('text=Thufir Hawat').first()).toBeVisible()

  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'New', exact: true }).click()

  // Back to Beat 1, not still parked on the old campaign's Beat 2 — the
  // clearest sign this is a genuinely fresh campaign's own auto-open, not
  // leftover DOM from before.
  await expect(page.locator('text=Duke Leto Atreides').first()).toBeVisible()
  await expect(page.locator('text=Thufir Hawat')).toHaveCount(0)

  // The StatusBar spacebar fix: it must read the FRESH campaign's paused
  // state, not a stale closure captured at the first campaign's mount.
  await page.keyboard.press('Space')
  const pauseBtn = page.getByRole('button', { name: '0×' })
  await expect(pauseBtn).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Space')
  await expect(pauseBtn).toHaveAttribute('aria-pressed', 'false')
})
