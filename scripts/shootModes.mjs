// scripts/shootModes.mjs
// Driving the game into each scene mode from outside, for the screenshot harness.
//
// Every mode is reached the way a player reaches it, through the real input path
// rather than by poking the mode manager. A screenshot of a state the player
// cannot actually get to proves nothing about how the game looks.

/** Wait until the debug handle exists and the loop has drawn a few frames. */
export async function waitForGame(page) {
  await page.waitForFunction(() => {
    const d = window.__DUNE__
    return d && d.frame > 8
  }, null, { timeout: 45_000 })
}

/**
 * Let the renderer settle: camera easing, texture uploads, breathing drift.
 *
 * Bounded by wall clock as well as frame count, and that is not belt-and-braces
 * — it is the difference between working and hanging. Headless Chromium
 * rasterises through SwiftShader in software, and with bloom, SMAA and 4x MSAA
 * in the composer a 1920x1080 frame can take on the order of a second. A plain
 * "wait for 60 more frames" then means a minute of real time per capture, which
 * is how this harness first appeared to lock up. Frames are what the easing
 * actually needs, so ask for them, but give up waiting and shoot anyway rather
 * than block: a frame or two early costs a little camera drift, not a wrong
 * picture.
 */
export async function settle(page, frames = 12, budgetMs = 8_000) {
  const start = await page.evaluate(() => window.__DUNE__.frame)
  try {
    await page.waitForFunction(
      ([s, n]) => window.__DUNE__.frame > s + n,
      [start, frames],
      { timeout: budgetMs, polling: 250 },
    )
  } catch {
    // Software rendering simply could not deliver that many frames in time.
  }
}

export async function currentMode(page) {
  return page.evaluate(() => window.__DUNE__.mode)
}

/**
 * Set the hour. The day is DAY_SECONDS = 60 long, so these are fractions of it
 * and the palette is driven entirely from this clock.
 */
export async function setTime(page, seconds) {
  await page.evaluate(s => window.__DUNE__.setTime?.(s), seconds)
  await settle(page, 6)
}

/**
 * Zoom from orbit down to the surface.
 *
 * OrbitControl moves 0.00021 of the range per wheel unit and hands off at
 * zoom >= 0.999 starting from 0.475, so a full descent is about 2500 wheel
 * units. Sent in notches with settle time between, because the descent is eased
 * and firing it all at once just queues one jump.
 */
export async function descend(page, canvas) {
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, -250)
    await settle(page, 3)
    if ((await currentMode(page)) !== 'strategic') break
  }
  await settle(page, 14)
  return currentMode(page)
}

/** Pull back out of the surface view to orbit. */
export async function ascend(page, canvas) {
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 300)
    await settle(page, 3)
    if ((await currentMode(page)) === 'strategic') break
  }
  await settle(page, 10)
  return currentMode(page)
}

/**
 * Stand the player at a settlement and open its conversation.
 *
 * teleport puts them there without a flight; pick is the same dispatch a click
 * on the marker goes through, so the resulting view is the real one.
 */
export async function talkAt(page, villageId) {
  await page.evaluate(id => window.__DUNE__.teleport?.(id), villageId)
  await settle(page, 10)
  await page.evaluate(id => window.__DUNE__.pick(id), villageId)
  await settle(page, 14)
  return currentMode(page)
}

/** Escape backs out of a location or conversation. */
export async function escape(page) {
  await page.keyboard.press('Escape')
  await settle(page, 10)
  return currentMode(page)
}

/** Reveal the desert finds so the strategic view has something on it. */
export async function populateWorld(page) {
  await page.evaluate(() => {
    const d = window.__DUNE__
    d.revealSites?.()
    d.giveHarvester?.()
  })
  await settle(page, 10)
}

/** Draw-call and triangle counts, for a cost read alongside each frame. */
export async function renderCost(page) {
  return page.evaluate(() => ({
    mode: window.__DUNE__.mode,
    ...window.__DUNE__.renderInfo,
  }))
}
