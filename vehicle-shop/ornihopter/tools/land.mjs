// vehicle-shop/ornihopter/tools/land.mjs
// Fly a real approach with real keys and photograph the landing lifecycle:
// approach, touchdown, at rest with the wings parked, takeoff. shoot.mjs poses
// the craft; this one refuses to — every frame here comes out of the live sim
// under keyboard input, because the round's claim is about behaviour over time.
//
// Usage: node vehicle-shop/ornihopter/tools/land.mjs [--out .shots/thopter-landing]
// Needs a dev server already on :5219 (npx vite vehicle-shop/ornihopter --port 5219).

import { chromium } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const OUT = flag('out', '.shots/thopter-landing')
const PORT = Number(flag('port', 5219))
const WIDTH = Number(flag('width', 1600))
const HEIGHT = Number(flag('height', 1000))

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
await page.mouse.click(WIDTH / 2, HEIGHT / 2) // focus, so real key events land

const state = () => page.evaluate(() => window.__THOPTER__.state())

// Side-on and low, the parked stance the gear rounds were judged in: this is
// the view where a skid sole either sits on the sand line or is under it.
await page.evaluate(() => window.__THOPTER__.viewpoint(-90, 6, 2.3))

const log = []
const shots = {}
const shoot = async (name) => {
  const file = join(OUT, `${name}.png`)
  await page.screenshot({ path: file })
  shots[name] = file
  const s = await state()
  log.push({ name, file, altitude: s.altitude, speed: s.speed, beatHz: s.beatHz, landed: s.landed === true, beatAmplitude: s.beatAmplitude })
  return s
}

// The lowest rendered point of the craft against the sand directly beneath it.
// state.position.y - state.altitude IS the terrain height under the craft, so
// this is sole-to-sand in metres: 0 is standing on it, negative is sunk in.
const soleClearance = () =>
  page.evaluate(() => {
    const s = window.__THOPTER__.state()
    const m = window.__THOPTER__.measure()
    return { boxHeight: m.height, altitude: s.altitude, y: s.position.y }
  })

const hold = async (key, ms) => {
  await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  await page.keyboard.up(key)
}

// 1. APPROACH. Throttle closed, then a short push on the stick and hands off:
// the same script flight/landingScenario.ts flies in the unit tests.
await hold('Control', 1400)
await hold('w', 320)
await shoot('01-approach')

// 2. Ride it down. Poll for the model's own landed flag rather than guessing.
let touchdown = null
for (let i = 0; i < 240; i++) {
  const s = await state()
  if (s.landed === true) {
    touchdown = s
    break
  }
  await page.waitForTimeout(250)
}
await shoot('02-touchdown')

// 3. Spool down and settle. Longer than the 2.5s ramp, so the frame is of a
// craft that has finished stopping, not one caught mid-wind-down.
await page.waitForTimeout(5000)
const rest = await shoot('03-at-rest')
const clearance = await soleClearance()

// 4. TAKEOFF. Throttle up past the gate, then rotate.
await hold('Shift', 2000)
await shoot('04-spooling')
await hold('s', 1500)
await page.waitForTimeout(1200)
const flying = await shoot('05-takeoff')

const manifest = {
  out: OUT,
  frames: log,
  touchdown,
  rest,
  flying,
  soleToSand: clearance,
  errors,
}
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
await browser.close()

console.log(JSON.stringify(manifest, null, 2))
