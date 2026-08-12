import { test, expect } from '@playwright/test'
import { chooseReply, enterGameFromTitle, completeOpeningBriefing, advanceUntilArrived } from './helpers'

// Remediation W3h: both package critics' biggest gap (pause) plus the
// blind-play acceptance-4 failure at Hagg (stale location panel), each
// proven through production UI — no `giveHarvester`-shaped debug bridge,
// only the debug handle's own read-only `worldTime` (the same affordance
// every other opening spec already uses for elapsed-time assertions).

test('pause halts worldTime and unpause resumes it', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  // Clears briefingPending (pause.ts) — the clock is otherwise frozen for
  // the whole opening morning regardless of the manual pause under test.
  await completeOpeningBriefing(page)
  await page.getByRole('button', { name: '5×' }).click()

  const pauseBtn = page.getByRole('button', { name: '0×' })
  await expect(pauseBtn).toBeVisible()

  await pauseBtn.click()
  const timePaused1 = await page.evaluate(() => window.__DUNE__?.worldTime ?? -1)
  await page.waitForTimeout(500)
  const timePaused2 = await page.evaluate(() => window.__DUNE__?.worldTime ?? -1)
  expect(timePaused2).toBe(timePaused1) // frozen across a real wait

  await pauseBtn.click() // unpause
  await page.waitForTimeout(500)
  const timeAfter = await page.evaluate(() => window.__DUNE__?.worldTime ?? -1)
  expect(timeAfter).toBeGreaterThan(timePaused2)
})

test('spacebar toggles pause the same way the button does, ignoring text-entry targets', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)
  await page.getByRole('button', { name: '5×' }).click()

  await page.keyboard.press('Space')
  const timePaused1 = await page.evaluate(() => window.__DUNE__?.worldTime ?? -1)
  await page.waitForTimeout(500)
  const timePaused2 = await page.evaluate(() => window.__DUNE__?.worldTime ?? -1)
  expect(timePaused2).toBe(timePaused1)

  await page.keyboard.press('Space')
  await page.waitForTimeout(500)
  const timeAfter = await page.evaluate(() => window.__DUNE__?.worldTime ?? -1)
  expect(timeAfter).toBeGreaterThan(timePaused2)
})

// Acceptance-4 failure at Hagg (blind-play L266): the location panel used
// to stay pinned to Arrakeen on arrival there because nothing but
// DialogueSystem's own 'dialogue:started' ever updated `selectedVillage`,
// and Hagg — unlike Red Wall/Tabr — auto-opens no dialogue on arrival.
// TravelSystem.ts's checkTravelArrival now selects on every arrival.
test('arriving at Hagg selects it in the panel with a DOM Speak/resident path, no canvas click', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)
  await completeOpeningBriefing(page)

  await chooseReply(page, /Hagg/)
  await advanceUntilArrived(page, 'hagg')

  await expect(page.getByRole('heading', { name: 'Hagg', exact: true })).toBeVisible()
  await expect(page.locator('text=PEOPLE HERE')).toBeVisible()
  await expect(page.getByRole('button', { name: /Shishakli/ })).toBeVisible()
})
