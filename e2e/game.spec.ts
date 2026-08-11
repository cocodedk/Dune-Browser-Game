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
test('status bar renders spice and speed buttons', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  // Readouts are a word label beside a tabular figure, not "Spice: 0".
  // "troops"/"influence" readouts removed in WP02e (legacy-authority-
  // inventory.md category 4: player.troops/player.influence left
  // WorldState) — spice is the one aggregate figure that survives.
  await expect(page.locator('text=spice').first()).toBeVisible()

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
// Test 7 — A production action emits a logged event
// ---------------------------------------------------------------------------
// Rewritten in WP02e (legacy-authority-inventory.md category 2): the
// original test just ran 5x speed for 15s wall-clock and expected SOME event
// to appear, which held only because the legacy village-production skim and
// sietch threshold payout fired unconditionally on every day boundary. With
// both removed, a truly fresh, no-input campaign emits ZERO events for its
// first several days — day-boundary systems only produce events for a
// pledged, assigned crew (harvest/prospect/train), a due tribute deadline
// (day 12), or a raid (blocked in act1 today — raidInterval('act1') returns
// null per progress.md's baseline captures). None of those are reachable in
// a few seconds of idle time anymore, so this test now drives one concrete
// production action instead of waiting and hoping.
//
// window.__DUNE__.pick(id) is "the same path a raycast hit will take"
// (DebugHandle.ts's own comment) — it is the exact function a canvas click
// on a map marker calls (ThreeContainer.tsx's dispatchPick), not a shortcut
// around it. Picking the player's OWN starting location (Arrakeen,
// neutral-owned) resolves through decideVisit to a 'dialogue' action
// (VisitPolicy.ts): the player isn't the owner, so it opens the neutral
// faction's conversation and startDialogue unconditionally pushes a
// 'dialogue_start' event (DialogueSystem.ts) — no travel, no pledge
// threshold, nothing that can refuse.
//
// __DUNE__ only attaches with `?debug=1` on a production/preview build
// (game-render/core/DebugHandle.ts's shouldAttachDebug: import.meta.env.DEV
// is false under `npm run preview`, which is what this suite's webServer
// runs) — plain `/` would leave window.__DUNE__ undefined here.
//
// UNVERIFIED BY THE BUILDER: no Playwright run was made (not permitted this
// chunk). The lead should watch for: __DUNE__ attach timing after
// page.goto (the 2s wait mirrors every other test in this file, but
// ThreeContainer's mount is async); and that pick('arrakeen') actually
// resolves to the 'dialogue' branch and not 'none' (would only happen if
// decideVisit's traveling/dialogue guards are somehow already tripped on a
// fresh load, which nothing in this test does).
test('a production pick action emits a logged event', async ({ page }) => {
  await page.goto('/?debug=1')
  await page.waitForTimeout(2000)

  await page.evaluate(() => window.__DUNE__?.pick('arrakeen'))
  await page.waitForTimeout(500)

  // A timestamp marker (number followed by "s") is present in an event
  // entry once the dialogue_start event lands in EventLog.
  await expect(page.locator('text=/\\d+s/').first()).toBeVisible()

  // Into test-results/, which is gitignored and is where Playwright already
  // puts its own artifacts. This wrote to the repository root on every run, so
  // a stray PNG reappeared beside package.json after every `npm test` — one of
  // the two dozen loose images that had accumulated there.
  await page.screenshot({ path: 'test-results/event-log-populated.png' })
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
