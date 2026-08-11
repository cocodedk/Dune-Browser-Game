import { test, expect } from '@playwright/test'
import {
  chooseReply, clickButton, enterGameFromTitle, completeOpeningBriefing,
  advanceUntilArrived, reachFirstCrew,
} from './helpers'

// Chunk W3f: two 03-opening-experience.md "Recovery and refusal behavior"
// rows with no browser-level assertion before this chunk, plus a positive-
// presence proof for the coach-mark system itself (see the third test's own
// header — opening5.spec.ts only proves ABSENCE with guidance off, which is
// vacuously true if the component never renders at all).

// Guidance defaults on: a mark appears at the active objective's target and
// disappears the instant the player performs the step — 03 "Guidance
// behavior": "disappears when the player performs the action, not after a
// timer." Arrival alone clears it; nothing here dismisses it directly.
test('a coach mark appears at the active objective\'s target and disappears once the player performs the step', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)

  // act1.travel_red_wall is active — the ★ and the mark both sit on the Red
  // Wall row.
  const redWallAtArrakeen = page.getByRole('button', { name: /Red Wall Sietch/ })
  await expect(redWallAtArrakeen).toContainText('★')
  await expect(page.locator('text=Travel here')).toBeVisible()

  await chooseReply(page, /Hagg/)
  await advanceUntilArrived(page, 'hagg')
  const redWallAtHagg = page.getByRole('button', { name: /Red Wall Sietch/ })
  await redWallAtHagg.dispatchEvent('click')
  await advanceUntilArrived(page, 'red_wall_sietch')

  // Arrival is the real signal (act1.travel_red_wall completes) — no timer,
  // no dismiss click.
  await expect(page.locator('text=Travel here')).toHaveCount(0)
})

// Rule 3 (dismissable) proven through the real click, not just the
// localSettings unit tests (which prove storage round-trips a key — not
// that the ✕ actually writes it, or that the component hides on the next
// render). Dismissing one mark hides only that mark: the row underneath
// stays visible (03 rule 3: "the objective and normal disabled-reason UI
// remain"), and a LATER step's own mark still appears normally once
// reached — proving the dismissal is scoped per-mark, not global.
test('dismissing one coach mark hides only that mark; a later step still gets its own', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)

  await expect(page.locator('text=Travel here')).toBeVisible()
  await clickButton(page, '✕') // the mark's own dismiss — not DialoguePanel's × (U+00D7)
  await expect(page.locator('text=Travel here')).toHaveCount(0)

  // The row itself is untouched — still there, still the real click path.
  await expect(page.getByRole('button', { name: /Red Wall Sietch/ })).toBeVisible()

  await chooseReply(page, /Hagg/)
  await advanceUntilArrived(page, 'hagg')
  const redWallAtHagg = page.getByRole('button', { name: /Red Wall Sietch/ })
  await redWallAtHagg.dispatchEvent('click')
  await advanceUntilArrived(page, 'red_wall_sietch')
  await chooseReply(page, /fair exchange/i)
  await chooseReply(page, /Agreed/i)

  // Beat 4's own mark (pledge-button) shows normally — the earlier
  // dismissal never touched it.
  await expect(page.locator('text=Pledge here')).toBeVisible()
})

// Row (c): "Orders prospecting without a thopter | Refuse before
// confirmation and identify the equipment/location path." CrewCard.tsx's
// order() now runs the same read-only checkAssign the command itself would,
// BEFORE opening ConfirmModal — this proves that through production UI, not
// just the command-layer unit test (assignCrewCommand.fixtures.test.ts's
// own "refuses prospecting without an ornithopter", which calls the command
// directly and cannot see whether a modal appeared first).
test('ordering prospect without a thopter refuses before confirmation, naming the equipment path', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)
  await reachFirstCrew(page) // one crew, pledged and harvesting — no thopter owned

  await clickButton(page, 'prospect')

  // Refused inline — no confirm modal opens at all.
  await expect(page.getByRole('button', { name: 'Issue order' })).toHaveCount(0)
  await expect(page.locator('text=/Order: prospect/')).toHaveCount(0)

  // The refusal names the equipment/location path (assign.ts's own copy).
  await expect(page.locator('text=/buy one from the smuggler/')).toBeVisible()
})

// Row (f): "Closes during travel or settlement | Autosave restores the same
// travel or pending-decision state without duplication." No production path
// autosaves at the instant a pending settlement is created (only
// opening.complete does, commandHandlers.ts) — this exercises the one save
// mechanism that exists today, the rolling save (progress.md Round 11:
// "autosave = the existing rolling save, slots are WP11's").
test('reload during the pending Q1 settlement restores the same decision, no duplication', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)
  await reachFirstCrew(page)

  await page.evaluate(t => window.__DUNE__?.setTime?.(t), 12 * 60 + 1)
  await expect(page.getByRole('button', { name: 'Settle' })).toBeVisible()

  // The whole canonical state (state/hash.ts) round-trips identically — a
  // stronger proof than reading one figure off the modal, and the same
  // "browser trace hashes before/after" pattern hashState's own doc names.
  const hashBefore = await page.evaluate(() => window.__DUNE__?.hashState?.())

  await clickButton(page, 'Save')
  await page.waitForTimeout(500) // IndexedDB round trip, no on-screen signal

  await page.reload()
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.locator('#scene-container canvas').waitFor({ state: 'attached' })
  await page.waitForTimeout(1000)

  const hashAfter = await page.evaluate(() => window.__DUNE__?.hashState?.())
  expect(hashAfter).toBe(hashBefore)
  await expect(page.getByRole('button', { name: 'Settle' })).toBeVisible()

  // Settling still works exactly once — one decision, not a duplicate.
  await clickButton(page, 'Full (', false)
  await clickButton(page, 'Settle')
  await expect(page.getByRole('button', { name: 'Settle' })).toHaveCount(0)
})
