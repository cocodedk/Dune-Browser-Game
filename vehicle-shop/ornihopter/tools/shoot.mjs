// vehicle-shop/ornihopter/tools/shoot.mjs
// Capture the ornithopter from the viewpoints the bar names, at fixed poses
// and fixed beat phases, so a critic judges frames rather than a description
// of frames and two runs of the same view are the same image.
//
// Usage: node vehicle-shop/ornihopter/tools/shoot.mjs [--out .shots/thopter-shop] [--width 1600] [--height 1000]

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const OUT = flag('out', '.shots/thopter-shop')
const WIDTH = Number(flag('width', 1600))
const HEIGHT = Number(flag('height', 1000))
const PORT = Number(flag('port', 5219))

// Viewpoints chosen to match the reference photographs the bar scores against.
// azimuth 0 looks up the craft's tail, 90 is its port flank; elevation 90 is
// straight down. Distance is in craft lengths.
const VIEWS = [
  { name: 'top', ref: 'mr-O9copy.jpg', az: 0, el: 88, dist: 1.9, beat: 0 },
  { name: 'side', ref: 'mr-O4copy.jpg', az: 90, el: 3, dist: 2.1, beat: 0 },
  { name: 'hero', ref: 'thopter-mr.jpg', az: 42, el: 24, dist: 1.7, beat: 0 },
  { name: 'rear34', ref: 'mr-IMG_9407.jpg', az: 145, el: 20, dist: 1.7, beat: 0 },
  // The same hero angle across the beat, because one unlucky phase is not a
  // verdict — the previous loop was judged harshly on a single edge-on frame.
  { name: 'hero-beat-up', ref: '', az: 42, el: 24, dist: 1.7, beat: Math.PI / 2 },
  { name: 'hero-beat-down', ref: '', az: 42, el: 24, dist: 1.7, beat: (3 * Math.PI) / 2 },
]

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const server = spawn('npx', ['vite', 'vehicle-shop/ornihopter', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
const kill = () => {
  try {
    server.kill('SIGTERM')
  } catch {
    /* already gone */
  }
}
process.on('exit', kill)

const ready = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve(false), 60000)
  const watch = (chunk) => {
    if (String(chunk).includes(`:${PORT}`)) {
      clearTimeout(timer)
      resolve(true)
    }
  }
  server.stdout.on('data', watch)
  server.stderr.on('data', watch)
})
if (!ready) {
  kill()
  throw new Error('vite did not start')
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' })
await page.waitForFunction(() => Boolean(window.__THOPTER__), null, { timeout: 30000 })
// Let the first frames settle so materials and shadow maps are resident.
await page.waitForTimeout(1200)

const measurement = await page.evaluate(() => window.__THOPTER__.measure())

const manifest = { width: WIDTH, height: HEIGHT, measurement, views: [], errors }

for (const view of VIEWS) {
  await page.evaluate(
    ([az, el, dist, beat]) => {
      const t = window.__THOPTER__
      t.pose(0, 0, beat)
      t.viewpoint(az, el, dist)
    },
    [view.az, view.el, view.dist, view.beat]
  )
  await page.waitForTimeout(320)
  const file = join(OUT, `${view.name}.png`)
  await page.screenshot({ path: file })
  manifest.views.push({ ...view, file })
}

// Pilot's-eye view, flying rather than parked: the cockpit has to read while
// the craft is actually moving, and a parked craft hides a camera that lags.
await page.evaluate(() => window.__THOPTER__.resume())
await page.waitForTimeout(2500)
await page.evaluate(() => window.__THOPTER__.setCamera('pilot'))
await page.waitForTimeout(900)
await page.screenshot({ path: join(OUT, 'pilot.png') })
manifest.views.push({ name: 'pilot', ref: 'thopter-03.jpg', file: join(OUT, 'pilot.png') })

await page.evaluate(() => window.__THOPTER__.setCamera('chase'))
await page.waitForTimeout(900)
await page.screenshot({ path: join(OUT, 'chase.png') })
manifest.views.push({ name: 'chase', ref: '', file: join(OUT, 'chase.png') })

manifest.flightState = await page.evaluate(() => window.__THOPTER__.state())
manifest.errors = errors

await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
await browser.close()
kill()

console.log(`captured ${manifest.views.length} views to ${OUT}`)
console.log('measurement:', JSON.stringify(measurement))
if (errors.length) {
  console.log(`\nPAGE ERRORS (${errors.length}):`)
  for (const e of errors.slice(0, 12)) console.log('  ' + e)
}
