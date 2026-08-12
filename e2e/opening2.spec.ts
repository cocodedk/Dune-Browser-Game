import { test, expect } from '@playwright/test'
import { chooseReply, clickButton, enterGameFromTitle, completeOpeningBriefing, advanceUntilArrived } from './helpers'

// Chunk W3d's browser scenario (03-opening-experience.md "Browser
// scenarios" #1, the remaining legs: "...Red Wall flight -> Stilgar
// dialogue -> pledge -> crew order -> projection change"). Split from
// opening.spec.ts (W3c), which the 200-line cap left no room for this in.
//
// `?debug=1` is required throughout — advanceUntilArrived (e2e/helpers.ts)
// needs window.__DUNE__.setTime, the established "advance time via the
// debug handle" pattern (progress.md Round 9). Every dialogue reply and
// every confirm-modal button uses chooseReply's dispatchEvent path, never
// bare click() — both hazards are the same one chooseReply's own doc names:
// a click that synchronously unmounts its own button.
test('destinations, Stilgar trust, pledge confirm, crew order, and the ledger projection all move through production UI', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)

  // Progressive disclosure: neither surface exists before Beat 1 completes.
  await expect(page.locator('text=Known destinations')).toHaveCount(0)

  await completeOpeningBriefing(page)

  // Beat 3: the destination list appears once the briefing completes, and
  // renders travelCheckTo's own answer per entry — Red Wall is two hops
  // away (Hagg is the required waypoint), so it starts unreachable.
  await expect(page.locator('text=Known destinations')).toBeVisible()
  const redWallAtArrakeen = page.getByRole('button', { name: /Red Wall Sietch/ })
  await expect(redWallAtArrakeen).toBeVisible()
  await expect(redWallAtArrakeen).toBeDisabled()
  // W3h: the old "Too far without a long-range ornithopter" copy read as an
  // equipment gate; the real rule is region adjacency on foot (rules.ts).
  await expect(redWallAtArrakeen).toContainText(/Out of walking range/)
  await expect(redWallAtArrakeen).toContainText('Stilgar') // "who is known there"

  // First leg: Arrakeen -> Hagg, the required waypoint.
  await chooseReply(page, /Hagg/)
  await advanceUntilArrived(page, 'hagg')

  // Second leg: Hagg -> Red Wall, now in range.
  const redWallAtHagg = page.getByRole('button', { name: /Red Wall Sietch/ })
  await expect(redWallAtHagg).toBeEnabled()
  await expect(redWallAtHagg).toContainText(/\d+s/)
  await redWallAtHagg.dispatchEvent('click')
  await advanceUntilArrived(page, 'red_wall_sietch')

  // Beat 4: story/redwall_trust auto-opens once, unprompted, on arrival.
  await expect(page.locator('text=Stilgar').first()).toBeVisible()
  await chooseReply(page, /fair exchange/i) // the transaction branch
  await chooseReply(page, /Agreed/i)

  // Loyalty 55 (data/sietches.ts) + this reply's +5 = 60, exactly
  // PLEDGE_THRESHOLD — the pledge control is enabled with no gift needed.
  await expect(page.locator('text=Loyalty 60 / need 60')).toBeVisible()
  await expect(page.locator('text=Pledges 0/2')).toBeVisible()
  const pledgeBtn = page.getByRole('button', { name: /Pledge the Fremen of Red Wall Sietch/ })
  await expect(pledgeBtn).toBeEnabled()
  await clickButton(page, 'Pledge the Fremen', false) // opens the confirm step

  await expect(page.locator('text=/one crew/')).toBeVisible() // "not an unlabelled ownership button"
  await clickButton(page, 'Pledge')

  // Beat 5: the crew panel is gated on the first pledge — it did not exist
  // before this.
  await expect(page.locator('text=Crews')).toBeVisible()
  await expect(page.locator('text=/Recommended: Red Wall Pan/')).toBeVisible()

  const verdictBefore = await page.locator('text=/short by|surplus/').first().textContent()

  await clickButton(page, 'Red Wall Pan', false) // the recommended field
  await expect(page.locator('text=/no yield today/')).toBeVisible()
  await clickButton(page, 'Issue order')

  // The order visibly changes the ledger projection — 03: "Issuing the
  // first harvest order immediately changes the ledger projection."
  await expect.poll(
    async () => page.locator('text=/short by|surplus/').first().textContent(),
  ).not.toBe(verdictBefore)

  // Objective advances to act1.prepare_q1 and presents both valid plans.
  await expect(page.locator('text=Prepare to meet the first tribute')).toBeVisible()
  await expect(page.locator('text=/Reserve: keep the field worked/')).toBeVisible()
  await expect(page.locator('text=/Invest: visit Sietch Tabr/')).toBeVisible()
})
