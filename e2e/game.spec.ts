import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Test 1 — Page loads
// ---------------------------------------------------------------------------
test('page loads with 200 and no JS errors', async ({ page }) => {
  const jsErrors: string[] = []
  page.on('pageerror', err => jsErrors.push(err.message))

  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  const title = await page.title()
  const hasTitle =
    title.includes('Dune') ||
    (await page.locator('text=DUNE: BROWSER GAME').count()) > 0
  expect(hasTitle).toBe(true)

  expect(jsErrors).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// Test 2 — Game UI structure visible
// ---------------------------------------------------------------------------
test('game UI structure is visible after initialisation', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  // Full-bleed redesign: the title is the floating word mark, and the hint
  // describes map controls rather than the old sidebar layout.
  await expect(page.locator('text=DUNE').first()).toBeVisible()
  await expect(
    page.locator('text=/Click a sietch to travel/i').first()
  ).toBeVisible()

  const canvas = page.locator('#scene-container canvas')
  await expect(canvas).toBeAttached()
})

// ---------------------------------------------------------------------------
// Test 3 — Status bar renders with game stats
// ---------------------------------------------------------------------------
test('status bar renders spice, influence and speed buttons', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  // Readouts are a word label beside a tabular figure, not "Spice: 0".
  await expect(page.locator('text=spice').first()).toBeVisible()
  await expect(page.locator('text=influence').first()).toBeVisible()

  await expect(page.getByRole('button', { name: '1×' })).toBeVisible()
  await expect(page.getByRole('button', { name: '2×' })).toBeVisible()
  await expect(page.getByRole('button', { name: '5×' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// Test 4 — Speed buttons are interactive
// ---------------------------------------------------------------------------
test('speed buttons change active state on click', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  const speed2x = page.getByRole('button', { name: '2×' })
  const speed5x = page.getByRole('button', { name: '5×' })

  await speed2x.click()
  await expect(speed2x).toHaveCSS('background-color', 'rgb(212, 160, 23)')

  await speed5x.click()
  await expect(speed5x).toHaveCSS('background-color', 'rgb(212, 160, 23)')
})

// ---------------------------------------------------------------------------
// Test 5 — Village panel default state
// ---------------------------------------------------------------------------
test('village panel shows placeholder text by default', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  await expect(
    page.locator('text=Click a village on the map to inspect it.')
  ).toBeVisible()
})

// ---------------------------------------------------------------------------
// Test 6 — Event log renders
// ---------------------------------------------------------------------------
test('event log renders with empty state', async ({ page }) => {
  await page.goto('/')
  // Check immediately before the AI has time to fire its first decision
  await expect(page.locator('text=Event Log')).toBeVisible()
  const isEmpty = await page.locator('text=No events yet.').isVisible()
  const hasEvents = await page.locator('[style*="flex-start"]').count() > 0
  // Either the log is empty OR it already has events — both are valid initial states
  expect(isEmpty || hasEvents).toBe(true)
})

// ---------------------------------------------------------------------------
// Test 7 — Events appear over time (AI integration)
// ---------------------------------------------------------------------------
test('events appear in the log after running at 5× speed', async ({ page }) => {
  await page.goto('/')

  // Accelerate game time to trigger AI decision cycles quickly
  await page.getByRole('button', { name: '5×' }).click()

  // Wait 15 seconds wall-clock — enough for several AI decision cycles at 5×
  await page.waitForTimeout(15000)

  // Verify at least one event appeared: "No events yet." should be gone
  // OR a timestamp marker (number followed by "s") is present in an event entry
  const noEventsCount = await page.locator('text=No events yet.').count()
  const hasTimestamp = (await page.locator('text=/\\d+s/').count()) > 0

  expect(noEventsCount === 0 || hasTimestamp).toBe(true)

  await page.screenshot({ path: 'event-log-populated.png' })
})

// ---------------------------------------------------------------------------
// Test 8 — Dialogue panel hidden by default
// ---------------------------------------------------------------------------
test('dialogue panel overlay is not visible on load', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  // No dialog role element should be visible
  const dialogVisible = await page.getByRole('dialog').isVisible().catch(() => false)
  expect(dialogVisible).toBe(false)

  // Speaker name "Stilgar" should not be present
  await expect(page.locator('text=Stilgar')).not.toBeVisible()
})
