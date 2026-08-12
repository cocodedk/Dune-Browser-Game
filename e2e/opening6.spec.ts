import { test, expect } from '@playwright/test'
import { chooseReply, clickButton, enterGameFromTitle, completeOpeningBriefing, reachFirstCrew } from './helpers'

// Chunk W3g: browser scenario #2 (03-opening-experience.md "Browser
// scenarios" — "The reserve line through Q1 settlement and opening
// autosave"). reachFirstCrew (e2e/helpers.ts) carries Beats 3-5 (Red Wall
// pledged, one crew harvesting); this scenario adds no second pledge — the
// reserve line, `opening-reserve-line`'s own branch — then settles Q1 and
// proves the resulting autosave through the title's own Continue button,
// not a raw hash/IndexedDB read (that proof already exists in opening4
// .spec.ts's settlement-reload test).
test('reserve line settles Q1 with one crew, and the opening autosave survives a reload via Continue', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)
  await reachFirstCrew(page) // Red Wall pledged, one crew harvesting — no second pledge

  // Reserve line: exactly one crew — Tabr was never visited.
  await expect(page.locator('text=Red Wall Sietch').first()).toBeVisible()
  await expect(page.locator('text=sietch_tabr')).toHaveCount(0)

  await page.evaluate(t => window.__DUNE__?.setTime?.(t), 12 * 60 + 1)
  await expect(page.getByRole('button', { name: 'Settle' })).toBeVisible()

  // Reserve line lands FULL (WP04 chunk W4e's yield-lever retune — stock
  // now clears the 90 due by day 12; pre-retune this was PARTIAL and used
  // "Pay all available", not "Full" — see W3h finding 3b/F3 for that label
  // rule, still correct, just landing on the other branch now).
  await clickButton(page, 'Full (', false)
  await clickButton(page, 'Settle')

  // Beat 7's debrief opens, whichever band the reserve line lands in —
  // walked past rather than asserted on: opening-q1-debrief.ts's reply text
  // ("Go on." / "Understood.") is identical across all three bands.
  await expect(page.locator('text=Count Fenring').first()).toBeVisible()
  await chooseReply(page, /Go on/i)
  await expect(page.locator('text=Thufir Hawat').first()).toBeVisible()
  await chooseReply(page, /Understood/i)

  await expect(page.locator('text=/Act 1 continues: strengthen your position/')).toBeVisible()

  // Autosave proof (03 recovery row (f) + Beat 7: "Q1 completion sets
  // opening.complete, autosaves..."): reload straight to the title screen —
  // Continue existing IS the probeSave proof (TitleScreen.tsx's own
  // persistence.ts's probeSave() read), not a raw hash comparison.
  //
  // Race-invariant assertions only, deliberately: `world.pendingSettlement`
  // and OPENING_COMPLETE_FLAG are both cleared/set SYNCHRONOUSLY inside
  // runSettleCommand, before onSettle's fire-and-forget saveGame() even
  // starts its IndexedDB write (commandHandlers.ts) — every possible save
  // snapshot already reflects both. The debrief dialogue itself is NOT
  // asserted after reload for the same reason in reverse: q1Debrief.ts's
  // per-tick hook can race that same save, so which exact dialogue state (if
  // any) got captured is not guaranteed run to run.
  await page.reload()
  await expect(page.getByRole('button', { name: /^Continue/ })).toBeVisible()

  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.locator('#scene-container canvas').waitFor({ state: 'attached' })
  await page.waitForTimeout(1000)

  // Not stuck mid-decision, and the opening chain still reads complete.
  await expect(page.getByRole('button', { name: 'Settle' })).toHaveCount(0)
  await expect(page.locator('text=/Act 1 continues: strengthen your position/')).toBeVisible()
})
