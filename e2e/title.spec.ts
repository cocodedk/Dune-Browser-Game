import { test, expect } from '@playwright/test'
import { enterGameFromTitle } from './helpers'

// Chunk W3b's two new browser scenarios (03-opening-experience.md "Title
// and run setup"): the title renders before the game, and difficulty is
// immutable once a campaign has started. Per Playwright's default fresh
// context per test (playwright.config.ts has no storageState), every test
// here starts with no rolling save — so New Campaign never meets the
// replace-warning path (see NewCampaignPanel.tsx), and Continue is never
// present on a fresh profile.

// ---------------------------------------------------------------------------
// New test 1 — the title renders before the game, and New Campaign enters it
// ---------------------------------------------------------------------------
test('title screen appears before the renderer mounts, and New Campaign enters the game', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'New Campaign' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load Campaign' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
  // A fresh profile has no rolling save — Continue must not appear.
  await expect(page.getByRole('button', { name: /^Continue/ })).toHaveCount(0)
  // The renderer has not mounted at all yet — not paused, not present.
  await expect(page.locator('#scene-container canvas')).toHaveCount(0)

  await enterGameFromTitle(page)

  await expect(page.locator('#scene-container canvas')).toBeAttached()
  await expect(page.locator('text=DUNE').first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// New test 2 — difficulty is chosen once and cannot change in-game
// ---------------------------------------------------------------------------
test('difficulty is written once at New Campaign and has no in-game control', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page, 'Hard')

  // 03: "the Difficulty buttons leave StatusBar entirely" — no mutable
  // difficulty control anywhere in the in-game UI.
  await expect(page.getByRole('button', { name: 'Easy', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Normal', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hard', exact: true })).toHaveCount(0)
  // It may still be displayed read-only (StatusBar's difficulty readout).
  await expect(page.locator('text=difficulty').first()).toBeVisible()

  // The setup panel's choice reached engine state — via the debug handle,
  // not the DOM (DebugHandle.ts's player().difficulty, chunk W3b).
  const difficulty = await page.evaluate(() => window.__DUNE__?.player?.().difficulty)
  expect(difficulty).toBe('hard')
})
