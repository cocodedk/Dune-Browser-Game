import { test, expect, type Page } from '@playwright/test'
import {
  chooseReply, clickButton, enterGameFromTitle, completeOpeningBriefing,
  advanceUntilArrived, reachFirstCrew,
} from './helpers'

// Chunk W3e's browser scenario (03-opening-experience.md "Teaching
// sequence" Beats 6-7): the Tabr gift dilemma, the loyalty climb through
// two gifts, a second pledge and crew, the day-12 settlement's patience
// preview, and the Fenring/Thufir debrief. Split from opening2.spec.ts
// (W3d), which the 200-line cap left no room for this in — reachFirstCrew
// (e2e/helpers.ts) now carries that file's Beats 3-5 leg for both specs.

/** Reads the settlement modal's due/stock figures straight from the DOM — a
 * canary: if a future balance change drops stock back under due, this fails
 * loudly instead of the full/minimum preview assertions below silently
 * collapsing into two identical bands. */
async function settlementFigures(page: Page): Promise<{ due: number; stock: number }> {
  return page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')]
    const due = Number(spans.find(s => s.textContent?.trim() === 'due')?.nextElementSibling?.textContent)
    const stock = Number(spans.find(s => s.textContent?.trim() === 'in stock')?.nextElementSibling?.textContent)
    return { due, stock }
  })
}

test('Tabr dilemma, gift climb, second crew, settlement preview, and the Q1 debrief all move through production UI', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)
  await reachFirstCrew(page) // Beats 3-5: Red Wall pledged, first crew harvesting

  // Travel: Red Wall -> Tabr (adjacent — one hop, no waypoint).
  const tabrAtRedWall = page.getByRole('button', { name: /Sietch Tabr/ })
  await tabrAtRedWall.dispatchEvent('click')
  await advanceUntilArrived(page, 'sietch_tabr')

  // Beat 6: story/tabr_dilemma auto-opens once, unprompted, on arrival.
  await expect(page.locator('text=Chani').first()).toBeVisible()

  // Decline path: close it early — legal per 03 ("must not script the
  // decision"), unlike Beat 4's mandatory trust exchange.
  await clickButton(page, '×')
  await expect.poll(() => page.evaluate(() => window.__DUNE__?.player?.().inDialogue)).toBe(false)

  // Tabr seeds at loyalty 45 (data/sietches.ts) — visible before any gift.
  await expect(page.locator('text=Loyalty 45 / need 60')).toBeVisible()

  // Gift twice via GiftPanel (clickButton pattern) — +8 loyalty each time.
  await clickButton(page, 'Gift spice (20)')
  await expect(page.locator('text=Loyalty 53 / need 60')).toBeVisible()
  await clickButton(page, 'Gift spice (20)')
  await expect(page.locator('text=Loyalty 61 / need 60')).toBeVisible() // >= 60: pledge now legal

  // Pledge Tabr — second crew.
  await clickButton(page, 'Pledge the Fremen', false)
  await clickButton(page, 'Pledge')
  await expect(page.locator('text=sietch_tabr').first()).toBeVisible() // CrewCard's homeSietchId

  // Order the second crew to its own recommended field — nth=1: both crews'
  // cards list every discovered field, and this one is the Tabr crew's
  // second-in-document-order card (Trap 2).
  await clickButton(page, 'tabr_shallows', false, 1)
  await clickButton(page, 'Issue order')

  // Measured (not assumed): two 15-hand crews harvesting from day ~0 still
  // land well under Q1's 90 due by day 12 (progress.md Round 2: "the
  // opening balance cannot clear Q1" even with every sietch pledged) — and
  // below minPartialPayment too, which would make the Full and Minimum
  // presets identical and defeat the very preview-varies assertion this
  // scenario exists to prove. giveHarvester (the established debug
  // affordance for this exact gap — DebugHandle.ts's own doc) closes it
  // without inventing a new mechanism.
  await page.evaluate(() => window.__DUNE__?.giveHarvester?.())

  // Advance to day 12 — the setTime pattern (progress.md Round 9). Waits on
  // the Settle button specifically, not "Imperial Tribute" text — that
  // heading also names QuotaLedger's always-mounted panel, which would make
  // this resolve immediately, before the day-12 boundary actually runs.
  await page.evaluate(t => window.__DUNE__?.setTime?.(t), 12 * 60 + 1)
  await expect(page.getByRole('button', { name: 'Settle' })).toBeVisible()

  const { due, stock } = await settlementFigures(page)
  expect(stock).toBeGreaterThanOrEqual(due) // canary: covers Q1 in full (two crews + giveHarvester)

  // The patience preview varies with the selected amount, BEFORE confirming.
  await clickButton(page, 'Full (', false)
  const fullText = await page.getByText(/^Selected —/).textContent()
  await clickButton(page, 'Minimum (', false)
  const minText = await page.getByText(/^Selected —/).textContent()
  expect(fullText).not.toBe(minText)
  expect(fullText).toContain('restored')
  expect(minText).toContain('arrears')

  // Settle in full.
  await clickButton(page, 'Full (', false)
  await clickButton(page, 'Settle')

  // No victory overlay interrupts play (03 Beat 7 / task reading: nothing
  // like it exists on the opening-completion path).
  await expect(page.locator('text=Arrakis is yours')).toHaveCount(0)
  await expect(page.locator('text=Your house falls')).toHaveCount(0)

  // Beat 7's debrief: Fenring's state-specific line, then Thufir's summary.
  await expect(page.locator('text=Count Fenring').first()).toBeVisible()
  await chooseReply(page, /Go on/i)
  await expect(page.locator('text=Thufir Hawat').first()).toBeVisible()
  await chooseReply(page, /Understood/i)

  // The objective surface moves past the opening chain.
  await expect(page.locator('text=/Act 1 continues: strengthen your position/')).toBeVisible()
})
