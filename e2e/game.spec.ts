import { test, expect } from '@playwright/test'
import { enterGame, enterGameFromTitle, completeOpeningBriefing } from './helpers'

// A title screen now sits in front of every scenario here (chunk W3b:
// 03-opening-experience.md "Title and run setup" — "The title screen
// appears before the renderer begins advancing campaign time"). Every test
// below enters via enterGame()/enterGameFromTitle() (e2e/helpers.ts); each
// test's ORIGINAL assertions are unchanged except where noted (chunk W3c's
// briefing auto-open changes first-load state — see Tests 2, 5, 7, 8).

// ---------------------------------------------------------------------------
// Test 1 — Page loads
// ---------------------------------------------------------------------------
test('page loads with 200 and no JS errors', async ({ page }) => {
  const jsErrors: string[] = []
  page.on('pageerror', err => jsErrors.push(err.message))

  // enterGame() both captures the raw navigation Response (for the status
  // check below) and enters a campaign, so "no JS errors" now covers the
  // title -> New Campaign transition too, not just the bare page load.
  const response = await enterGame(page)
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
// Repaired (chunk W3c): SceneModes.ts's nextMode() sends 'dialogue_start'
// straight to 'conversation' unconditionally, and ThreeContainer's frame
// loop fires it the moment `world.dialogue !== null` — true within the first
// rendered frame now that the briefing auto-opens on entry. ViewHint's
// strategic-mode copy this test checks is therefore never on screen on load
// any more; both beats are walked to their end first (nextMode's
// dialogue_end returns to 'strategic') so this still checks the same hint.
test('game UI structure is visible after initialisation', async ({ page }) => {
  await enterGame(page)
  await completeOpeningBriefing(page)

  // Full-bleed redesign: the title is the floating word mark, and the hint
  // describes map controls rather than the old sidebar layout.
  await expect(page.locator('text=DUNE').first()).toBeVisible()
  await expect(
    page.locator('text=/Click a location to travel/i').first()
  ).toBeVisible()

  const canvas = page.locator('#scene-container canvas')
  await expect(canvas).toBeAttached()
})

// ---------------------------------------------------------------------------
// Test 3 — Status bar renders with game stats
// ---------------------------------------------------------------------------
test('status bar renders spice and speed buttons', async ({ page }) => {
  await enterGame(page)

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
  await enterGame(page)

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
// Rewritten (chunk W3c): the opening's briefing now auto-opens on entry
// (runtime/openingBriefing.ts) via startDialogue('story/briefing', 'arrakeen'),
// and DialogueSystem's own 'dialogue:started' event (ui/store.ts) selects
// that villageId the same way any other conversation's opening always did —
// so a fresh campaign now starts with Arrakeen selected, not nothing. The
// placeholder text this test asserted is real UI (VillagePanel.tsx still
// shows it whenever selectedVillage is null); it is just not the state a
// fresh campaign lands in any more.
test('village panel shows the auto-selected Arrakeen on a fresh campaign', async ({ page }) => {
  await enterGame(page)

  await expect(page.getByRole('heading', { name: 'Arrakeen', exact: true })).toBeVisible()
  await expect(
    page.locator('text=Click a village on the map to inspect it.')
  ).not.toBeVisible()
})

// ---------------------------------------------------------------------------
// Test 6 — Event log renders
// ---------------------------------------------------------------------------
test('event log renders with empty state', async ({ page }) => {
  // No day-boundary system runs unprompted in campaign mode any more (see
  // Test 7's own header comment) — entering via the title no longer races
  // an "AI decision" that does not exist on this path.
  await enterGame(page)
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
// (DebugHandle.ts's own comment). Picking Arrakeen resolves through
// decideVisit to a 'dialogue' action (VisitPolicy.ts) — corrected from this
// test's own earlier (unverified) comment: Arrakeen has three named
// residents and residentsAt() lists Duke Leto first, so decideVisit's
// resident branch wins over treeForOwner('neutral') — it opens the ongoing
// 'story' tree's duke_briefing_root. Either way startDialogue unconditionally
// pushes a 'dialogue_start' event.
//
// Chunk W3c: a fresh campaign now auto-opens the Duke's own dedicated
// briefing and refuses to close it (or the ledger that follows) early
// (DialogueSystem.ts's canCloseDialogue()); pick() while a dialogue is open
// resolves to 'none' (VisitPolicy.ts's own guard), so both beats are walked
// to their real end via completeOpeningBriefing() first — the same click
// path a player takes — before this test's own pick() runs at all.
//
// __DUNE__ only attaches with `?debug=1` on a production/preview build and
// only once ThreeContainer mounts (W3b gates that on the title screen), so
// the debug query happens before entering via the title, not instead of it.
test('a production pick action emits a logged event', async ({ page }) => {
  await page.goto('/?debug=1')
  await enterGameFromTitle(page)

  await completeOpeningBriefing(page)

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
// Test 8 — Dialogue panel visible on load, naming the Duke
// ---------------------------------------------------------------------------
// Re-read (chunk W3c): the original assertion ran POST-entry — inside the
// test body, `enterGame(page)` (which enters a new campaign) runs BEFORE
// the dialogue-hidden check, so this test was always about the state right
// after entering, not the pre-entry title screen. That state has changed:
// 03 "Starting contract" ("simulation paused for the briefing") is now
// implemented as auto-open-once (runtime/openingBriefing.ts), so a fresh
// campaign's first-load state legitimately HAS a dialogue open. Fixed
// faithfully by asserting the new true state rather than the old one.
test('briefing dialogue is visible immediately after entering a new campaign, naming Duke Leto', async ({ page }) => {
  await enterGame(page)

  await expect(page.locator('text=Duke Leto Atreides').first()).toBeVisible()
  // Stilgar is Beat 4 content (W3d), never named this early.
  await expect(page.locator('text=Stilgar')).not.toBeVisible()
})

// Test 9 — completing both opening beats — lives in opening.spec.ts, split
// out to keep this file under the repository's 200-line cap.
