import { test, expect } from '@playwright/test'
import {
  chooseReply, clickButton, enterGameFromTitle, completeOpeningBriefing, advanceUntilArrived,
} from './helpers'

// Centre-screen guidance: the browser proof that the next action is legible
// where the player is actually looking, and that both spice-earning verbs
// can be performed from there without touching the command column.
//
// The defect this answers is the owner's own M1 verdict — "as a player I
// have no idea how to harvest or collect spice or anything useful except
// flying around and losing the game" — against his standing art direction,
// "my focus is on the center of the screen and I don't read the sidebar".
// Pledging a sietch and putting a crew on a field produce ALL spice income
// and both existed only as sidebar controls.
//
// Geometry is asserted numerically, not by screenshot: every surface here
// must sit left of `viewportWidth - COMMAND_COLUMN_WIDTH` (340,
// src/ui/theme.ts), i.e. genuinely over the 3D scene rather than over or
// inside the column. This is the same class of defect that had ConfirmModal
// rendering at x=2744 on a 3067px screen — trapped in the column's
// backdrop-filter containing block.
const COMMAND_COLUMN_WIDTH = 340

test('the objective line and both decision cards sit over the scene, and the opening economy starts from the centre', async ({ page }) => {
  test.setTimeout(60000)

  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)

  const viewport = page.viewportSize()
  if (!viewport) throw new Error('no viewport size — this scenario is geometric')
  const sceneRight = viewport.width - COMMAND_COLUMN_WIDTH

  // The active objective line MOVED out of the top-left corner into the
  // scene band (src/ui/ObjectiveBanner.tsx). Still exactly one element with
  // this text — opening.spec.ts:47 asserts the same string strictly, and a
  // duplicate in the corner would break it.
  const banner = page.locator('text=Travel to Red Wall Sietch')
  await expect(banner).toBeVisible()
  const bannerBox = await banner.boundingBox()
  if (!bannerBox) throw new Error('the objective banner has no box')
  expect(bannerBox.x + bannerBox.width).toBeLessThan(sceneRight)
  // ...and centred on the scene, not hugging the left edge the way the old
  // corner panel did at left:20.
  expect(bannerBox.x).toBeGreaterThan(120)

  // Beats 3-4, walked the ordinary way — the centre card is an addition to
  // this path, never a replacement for it.
  await chooseReply(page, /Hagg/)
  await advanceUntilArrived(page, 'hagg')
  const redWallAtHagg = page.getByRole('button', { name: /Red Wall Sietch/ })
  await redWallAtHagg.dispatchEvent('click')
  await advanceUntilArrived(page, 'red_wall_sietch')
  await chooseReply(page, /fair exchange/i)
  await chooseReply(page, /Agreed/i)

  // The pledge card, bottom of the scene band — the same place the dialogue
  // box just was, deliberately: that is the habit the opening trained.
  const pledgeFromCentre = page.getByRole('button', { name: 'Pledge Red Wall Sietch', exact: true })
  await expect(pledgeFromCentre).toBeVisible()
  const cardBox = await pledgeFromCentre.boundingBox()
  if (!cardBox) throw new Error('the pledge card has no box')
  expect(cardBox.x + cardBox.width).toBeLessThan(sceneRight)

  // Pledging FROM the card goes through the same confirmation the sidebar
  // raises (03 Beat 4: "not an unlabelled ownership button") — shared
  // wording, src/ui/confirmCopy.ts.
  await clickButton(page, 'Pledge Red Wall Sietch')
  await expect(page.locator('text=/one crew/')).toBeVisible()
  await clickButton(page, 'Pledge')

  // The pledge really ran: CrewPanel is gated on the first pledge, so its
  // heading appearing IS the crew being raised.
  await expect(page.locator('text=Crews')).toBeVisible()
  await expect(pledgeFromCentre).toHaveCount(0)

  // The first-harvest card follows on its own, naming the recommended field
  // in its BODY (never in the button — a "Red Wall Pan" button here would
  // collide with e2e/helpers.ts's reachFirstCrew).
  const sendToWork = page.getByRole('button', { name: 'Send them to work', exact: true })
  await expect(sendToWork).toBeVisible()
  await expect(page.locator('text=/Red Wall Pan is the nearest sand/')).toBeVisible()
  const harvestBox = await sendToWork.boundingBox()
  if (!harvestBox) throw new Error('the harvest card has no box')
  expect(harvestBox.x + harvestBox.width).toBeLessThan(sceneRight)

  // Same shape: confirm step first, carrying Beat 5's changeover cost.
  await clickButton(page, 'Send them to work')
  await expect(page.locator('text=/no yield today/')).toBeVisible()
  await clickButton(page, 'Issue order')

  // The order really ran: act1.order_first_harvest completes only on the
  // assign-crew command's own flag, so the objective advancing to
  // act1.prepare_q1 is engine-visible proof, not a UI echo.
  await expect(page.locator('text=Prepare to meet the first tribute')).toBeVisible()

  // Both cards retire once their work is done — no standing nag.
  await expect(sendToWork).toHaveCount(0)
  await expect(pledgeFromCentre).toHaveCount(0)
})

// "Not yet" is the decline verb, and it must behave like a coach mark's
// dismissal: gone until guidance is re-enabled (settings/localSettings.ts's
// setGuidanceEnabled(true) clears every dismissal), and gone WITHOUT taking
// the sidebar route with it — the card is an extra door, never the only one.
test('Not yet dismisses the card and leaves the command-column route intact', async ({ page }) => {
  test.setTimeout(60000)

  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)

  await chooseReply(page, /Hagg/)
  await advanceUntilArrived(page, 'hagg')
  await page.getByRole('button', { name: /Red Wall Sietch/ }).dispatchEvent('click')
  await advanceUntilArrived(page, 'red_wall_sietch')
  await chooseReply(page, /fair exchange/i)
  await chooseReply(page, /Agreed/i)

  const pledgeFromCentre = page.getByRole('button', { name: 'Pledge Red Wall Sietch', exact: true })
  await expect(pledgeFromCentre).toBeVisible()
  await clickButton(page, 'Not yet')
  await expect(pledgeFromCentre).toHaveCount(0)

  // The panel path is untouched — the same proof opening4's dismissal test
  // makes for coach marks.
  await expect(page.getByRole('button', { name: /Pledge the Fremen of Red Wall Sietch/ })).toBeEnabled()
})
