import { test, expect } from '@playwright/test'
import { advanceUntilArrived } from './helpers'
import { tabToButtonAndActivate } from './keyboardHelpers'

// Chunk W3g: browser scenario #6 (03-opening-experience.md "Browser
// scenarios" — "Keyboard-only traversal of title, setup, dialogue choices,
// destination list, pledge, crew order, and settlement") — the
// acceptance-4 proof ("Every required opening action has a visible legal
// path without clicking a canvas marker"). NO `.click()`, `.focus()`, or any
// mouse-shaped locator action anywhere in this file — only
// tabToButtonAndActivate (Tab + Enter) and two non-interactive time-skips
// (advanceUntilArrived's setTime, the same debug affordance every other
// opening spec already uses for elapsed time, not a UI action).
//
// The two confirmation modals (ConfirmModal, SettlementModal) both already
// bind a global `window` keydown listener for Enter (see their own headers)
// — a documented production affordance, not a test shortcut, so this
// scenario presses Enter directly for those two steps rather than
// Tab-hunting into the modal's own DOM position.
test('keyboard-only traversal reaches every required opening control with no mouse click', async ({ page }) => {
  test.setTimeout(60000)

  await page.goto('/?debug=1')

  // Title -> setup: New Campaign, then Normal (autoFocus'd by default, but
  // pressed explicitly to prove the control itself is keyboard-operable),
  // then Start Campaign.
  await tabToButtonAndActivate(page, /^New Campaign$/)
  await tabToButtonAndActivate(page, /^Normal$/)
  await tabToButtonAndActivate(page, /^Start Campaign$/)
  await page.locator('#scene-container canvas').waitFor({ state: 'attached' })
  await page.waitForTimeout(2000)

  // Both opening beats (Duke Leto, then Thufir) — completeOpeningBriefing's
  // own reply list (e2e/helpers.ts), walked via Tab/Enter instead of a click.
  const briefingReplies = [
    /understand the numbers first/i,
    /hear him out/i,
    /show me the rest/i,
    /what it becomes/i,
    /we are short/i,
    /closes it/i,
    /go earn one/i,
  ]
  for (const reply of briefingReplies) await tabToButtonAndActivate(page, reply)
  await page.getByRole('button', { name: /go earn one/i }).waitFor({ state: 'detached' })

  // Destination list: Arrakeen -> Hagg -> Red Wall Sietch.
  await tabToButtonAndActivate(page, /Hagg/)
  await advanceUntilArrived(page, 'hagg')
  await tabToButtonAndActivate(page, /Red Wall Sietch/)
  await advanceUntilArrived(page, 'red_wall_sietch')

  // Beat 4's auto-opened Stilgar dialogue (transaction branch).
  await tabToButtonAndActivate(page, /fair exchange/i)
  await tabToButtonAndActivate(page, /Agreed/i)

  // Pledge confirm: reach the button via Tab, then confirm via the modal's
  // own global Enter binding.
  await tabToButtonAndActivate(page, /Pledge the Fremen/)
  await page.locator('text=/one crew/').waitFor({ state: 'visible' })
  await page.keyboard.press('Enter')

  // Crew order: pick the recommended field, then confirm via the same
  // global Enter binding.
  await tabToButtonAndActivate(page, /Red Wall Pan/)
  await page.locator('text=/no yield today/').waitFor({ state: 'visible' })
  await page.keyboard.press('Enter')

  // Day 12 (non-interactive time-skip — not a UI action).
  await page.evaluate(t => window.__DUNE__?.setTime?.(t), 12 * 60 + 1)
  await expect(page.getByRole('button', { name: 'Settle' })).toBeVisible()

  // Settle: SettlementModal's own global Enter binding confirms the default
  // (full-affordable) amount — no preset button clicked, no Tab needed.
  await page.keyboard.press('Enter')

  await expect(page.getByRole('button', { name: 'Settle' })).toHaveCount(0)
})
