import { test, expect } from '@playwright/test'
import { chooseReply, clickButton, enterGameFromTitle, completeOpeningBriefing, advanceUntilArrived } from './helpers'

// Chunk W3f: the `opening-guidance-off` fixture (03-opening-experience.md
// "Deterministic fixtures") and recovery row (g) ("Dismisses every coach
// mark | All steps remain discoverable through objective, destination,
// resident, crew, and ledger UI"). Guidance is seeded OFF via localSettings
// before the app mounts — the cheap variant the chunk's own brief names,
// rather than walking the title's Settings toggle through the DOM first.
//
// Walked inline (not via helpers.ts's reachFirstCrew) so two checkpoints can
// sit exactly where a coach mark WOULD show if guidance were on — proving
// absence, not just running the same flow a second time.
test('with guidance disabled from the start, every step stays discoverable and the whole opening still completes', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('dune.settings.guidanceEnabled', 'false')
  })
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)

  // Checkpoint 1: act1.travel_red_wall is active — with guidance on this is
  // exactly when the Red Wall row gets a ★ and a "Travel here" mark. The row
  // itself (name, travel time, residents) must still be there and clickable.
  const redWallAtArrakeen = page.getByRole('button', { name: /Red Wall Sietch/ })
  await expect(redWallAtArrakeen).toBeVisible()
  await expect(redWallAtArrakeen).not.toContainText('★')
  await expect(page.locator('text=Travel here')).toHaveCount(0)

  await chooseReply(page, /Hagg/)
  await advanceUntilArrived(page, 'hagg')
  const redWallAtHagg = page.getByRole('button', { name: /Red Wall Sietch/ })
  await redWallAtHagg.dispatchEvent('click')
  await advanceUntilArrived(page, 'red_wall_sietch')

  await chooseReply(page, /fair exchange/i)
  await chooseReply(page, /Agreed/i)

  // Checkpoint 2: act1.earn_trust is active (EARNED_TRUST_FLAG is written by
  // the pledge command, not this dialogue) — with guidance on this is when
  // the mark would sit over the Pledge button. The button itself, and its
  // current/required loyalty readout, must still be visible and enabled —
  // discoverability never depended on the mark.
  await expect(page.locator('text=Pledge here')).toHaveCount(0)
  await expect(page.locator('text=Loyalty 60 / need 60')).toBeVisible()
  const pledgeBtn = page.getByRole('button', { name: /Pledge the Fremen of Red Wall Sietch/ })
  await expect(pledgeBtn).toBeEnabled()

  await clickButton(page, 'Pledge the Fremen', false)
  await clickButton(page, 'Pledge')
  await clickButton(page, 'red_wall_pan', false)
  await clickButton(page, 'Issue order')

  // Investment line through to Q1, same balance shape as opening3.spec.ts.
  const tabrAtRedWall = page.getByRole('button', { name: /Sietch Tabr/ })
  await tabrAtRedWall.dispatchEvent('click')
  await advanceUntilArrived(page, 'sietch_tabr')
  await expect(page.locator('text=Chani').first()).toBeVisible()
  await clickButton(page, '×') // decline the dilemma dialogue itself — legal

  // Each gift awaited to visible loyalty text before the next click
  // (opening3.spec.ts's own proven pattern): the Pledge button's clickButton
  // predicate only checks that a matching button EXISTS, not that it is
  // enabled — clicking through too fast can catch it mid-threshold, still
  // disabled, and produce a native no-op click.
  await clickButton(page, 'Gift spice (20)')
  await expect(page.locator('text=Loyalty 53 / need 60')).toBeVisible()
  await clickButton(page, 'Gift spice (20)')
  await expect(page.locator('text=Loyalty 61 / need 60')).toBeVisible()
  await clickButton(page, 'Pledge the Fremen', false)
  await clickButton(page, 'Pledge')
  await clickButton(page, 'tabr_shallows', false, 1)
  await clickButton(page, 'Issue order')

  await page.evaluate(() => window.__DUNE__?.giveHarvester?.())
  await page.evaluate(t => window.__DUNE__?.setTime?.(t), 12 * 60 + 1)
  await expect(page.getByRole('button', { name: 'Settle' })).toBeVisible()
  await clickButton(page, 'Full (', false)
  await clickButton(page, 'Settle')

  await expect(page.locator('text=Count Fenring').first()).toBeVisible()
  await chooseReply(page, /Go on/i)
  await expect(page.locator('text=Thufir Hawat').first()).toBeVisible()
  await chooseReply(page, /Understood/i)

  await expect(page.locator('text=/Act 1 continues: strengthen your position/')).toBeVisible()
})
