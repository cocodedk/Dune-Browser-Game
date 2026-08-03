// vehicle-shop/ornihopter/tools/fold.mjs
// Round 14's visual proof, flown with real keys: land hands-off, wait for the
// wings to park, press F, photograph the sweep and the stowed rest from the
// side and the hero camera, then unfold and fly away. Nothing is posed — every
// frame comes out of the live sim, like tools/land.mjs.
//
// Usage: node vehicle-shop/ornihopter/tools/fold.mjs [--out .shots/thopter-fold]
// Needs a dev server on :5219 (npx vite vehicle-shop/ornihopter --port 5219).

import { chromium } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const OUT = flag('out', '.shots/thopter-fold')
const PORT = Number(flag('port', 5219))
const WIDTH = 1600
const HEIGHT = 1000

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' })
await page.waitForFunction(() => Boolean(window.__THOPTER__), null, { timeout: 30000 })
await page.waitForTimeout(1200)
await page.mouse.click(WIDTH / 2, HEIGHT / 2)

const state = () => page.evaluate(() => window.__THOPTER__.state())
const side = () => page.evaluate(() => window.__THOPTER__.viewpoint(-90, 6, 2.6))
const hero = () => page.evaluate(() => window.__THOPTER__.viewpoint(-38, 14, 2.9))
const log = []
const shoot = async (name) => {
  const file = join(OUT, `${name}.png`)
  await page.screenshot({ path: file })
  const s = await state()
  log.push({
    name, file, landed: s.landed === true, beatHz: s.beatHz, beatAmplitude: s.beatAmplitude,
    foldPhase: s.foldPhase, foldProgress: s.foldProgress, foldTarget: s.foldTarget,
    foldRefused: s.foldRefused, throttle: s.throttle, altitude: s.altitude,
  })
  return s
}
const hold = async (key, ms) => {
  await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  await page.keyboard.up(key)
}

await side()

// 0. A fold demanded IN FLIGHT must be refused — the guard, seen live.
await page.keyboard.press('f')
await page.waitForTimeout(60)
const refusedInFlight = await state()

// 1. Land hands-off: throttle to zero and ride it down (round 13's procedure).
await hold('Control', 1400)
await hold('w', 320)
for (let i = 0; i < 240; i++) {
  const s = await state()
  if (s.landed === true) break
  await page.waitForTimeout(250)
}
await page.waitForTimeout(5200)
await shoot('01-parked-spread-side')
await hero()
await shoot('02-parked-spread-hero')
await side()

// 2. FOLD. Catch the sweep in the middle, then the stowed rest.
await page.keyboard.press('f')
await page.waitForTimeout(900)
await shoot('03-folding-side')
await page.waitForTimeout(700)
await shoot('04-folding-late-side')
await page.waitForTimeout(1800)
const stowed = await shoot('05-stowed-side')
await hero()
await shoot('06-stowed-hero')
await page.evaluate(() => window.__THOPTER__.viewpoint(0, 30, 3.4))
await shoot('07-stowed-top')
await side()

// 3. Throttle up while stowed: refused, and the craft stays on its feet.
await hold('Shift', 2500)
const refusedTakeoff = await shoot('08-throttle-up-while-stowed')

// 4. Unfold under that same held throttle, then leave.
await page.keyboard.press('f')
await page.waitForTimeout(3400)
await shoot('09-unfolded-side')
await hold('Shift', 2500)
await hold('s', 1500)
await page.waitForTimeout(1400)
const flying = await shoot('10-airborne')

const manifest = { out: OUT, frames: log, refusedInFlight, stowed, refusedTakeoff, flying, errors }
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
await browser.close()
console.log(JSON.stringify(manifest, null, 2))
