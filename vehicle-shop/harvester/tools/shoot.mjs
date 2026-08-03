// vehicle-shop/harvester/tools/shoot.mjs
// Capture the harvester from the viewpoints the bar names, at fixed poses,
// so a critic judges frames rather than a description of frames and two runs
// of the same view are the same image. VIEWS and the dev-server bring-up
// live in ./views.mjs and ./devServer.mjs (split out round I0 to keep this
// file under the 200-line cap once motion mode landed).
//
// Usage:
//   node vehicle-shop/harvester/tools/shoot.mjs [--out .shots/harvester] [--width 1600] [--height 1000] [--views hero,tracks]
//
// MOTION MODE — node vehicle-shop/harvester/tools/shoot.mjs --motion view,trackSpeed,dt
//   Captures a frame PAIR at a named view instead of the still set: the
//   machine parked (pose 0,0,0), paused, its tracks driven at trackSpeed
//   (signed m/s, both tracks) via window.__HARVESTER__.drive(), one frame at
//   t=0 and one after window.__HARVESTER__.tick(dt). Deterministic: dt is an
//   explicit sim-time step read through tick(), never the wall clock, so two
//   runs of the same --motion arguments produce byte-identical PNGs.
//   Example: --motion tracks,0.6,0.5 writes tracks-motion-a.png (t=0) and
//   tracks-motion-b.png (t=0.5s) — named so the pair sorts together in a
//   directory listing — plus a `motion` entry in manifest.json recording
//   the view, trackSpeed and dt.

import { chromium } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { filterViews, findView } from './views.mjs'
import { ensureDevServer } from './devServer.mjs'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const OUT = flag('out', '.shots/harvester')
const WIDTH = Number(flag('width', 1600))
const HEIGHT = Number(flag('height', 1000))
const PORT = Number(flag('port', 5220))
const MOTION = flag('motion', '')

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const { kill } = await ensureDevServer(PORT)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' })
await page.waitForFunction(() => Boolean(window.__HARVESTER__), null, { timeout: 30000 })
await page.waitForTimeout(1200)

// Hide the HUD overlay before any screenshot. #mode prints a live FPS
// counter every frame regardless of pause state (main.ts calls hud.update()
// unconditionally), driven by real inter-frame wall-clock timing — the one
// wall-clock leak in an otherwise deterministic capture path. Found because
// it broke pixel-identical motion pairs: two runs differed in exactly the
// #mode div's screen rect (top-right, index.html). Hiding it also gives a
// cleaner frame for a critic to judge the machine, not the debug telemetry.
await page.evaluate(() => {
  const hud = document.getElementById('hud')
  if (hud) hud.style.display = 'none'
})

// Measure at a DEFINED pose: parked at the origin, facing -Z, wings... pods
// at rest. Measuring whatever frame the sim happened to be on is meaningless
// for a crawler only if it was moving; parked is parked.
const measurement = await page.evaluate(() => {
  window.__HARVESTER__.pose(0, 0, 0)
  return window.__HARVESTER__.measure()
})

const manifest = { width: WIDTH, height: HEIGHT, measurement, views: [], errors }

if (MOTION) {
  const [viewName, speedStr, dtStr] = MOTION.split(',')
  const view = findView(viewName)
  const trackSpeed = Number(speedStr)
  const dt = Number(dtStr)
  manifest.motion = await shootMotionPair(page, OUT, view, trackSpeed, dt)
} else {
  const views = filterViews(flag('views', ''))
  for (const view of views) {
    await page.evaluate(
      ([az, el, dist]) => {
        const t = window.__HARVESTER__
        t.pose(0, 0, 0)
        t.viewpoint(az, el, dist)
      },
      [view.az, view.el, view.dist]
    )
    await page.waitForTimeout(320)
    const file = join(OUT, `${view.name}.png`)
    await page.screenshot({ path: file })
    manifest.views.push({ ...view, file })
  }
}

await page.evaluate(() => window.__HARVESTER__.resume())
await browser.close()
kill()
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
if (errors.length) {
  console.error('page errors:', errors)
  process.exitCode = 1
} else if (MOTION) {
  console.log(`captured motion pair for ${manifest.motion.view} to ${OUT}`)
} else {
  console.log(`captured ${manifest.views.length} views to ${OUT}`)
}

/** Park + pose + pause + drive, shoot A, tick(dt), shoot B. Returns the
 *  manifest entry (view name, viewpoint params, trackSpeed, dt, files). */
async function shootMotionPair(motionPage, out, view, trackSpeed, dt) {
  await motionPage.evaluate(
    ([az, el, dist, speed]) => {
      const t = window.__HARVESTER__
      t.pose(0, 0, 0)
      t.viewpoint(az, el, dist)
      t.pause()
      t.drive(speed)
    },
    [view.az, view.el, view.dist, trackSpeed]
  )
  await motionPage.waitForTimeout(320)
  const fileA = join(out, `${view.name}-motion-a.png`)
  await motionPage.screenshot({ path: fileA })

  await motionPage.evaluate((step) => window.__HARVESTER__.tick(step), dt)
  await motionPage.waitForTimeout(320)
  const fileB = join(out, `${view.name}-motion-b.png`)
  await motionPage.screenshot({ path: fileB })

  return { view: view.name, az: view.az, el: view.el, dist: view.dist, trackSpeed, dt, fileA, fileB }
}
