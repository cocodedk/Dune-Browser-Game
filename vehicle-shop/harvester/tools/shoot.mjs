// vehicle-shop/harvester/tools/shoot.mjs
// Capture the harvester from the viewpoints the bar names, at fixed poses,
// so a critic judges frames rather than a description of frames and two runs
// of the same view are the same image.
//
// Usage: node vehicle-shop/harvester/tools/shoot.mjs [--out .shots/harvester] [--width 1600] [--height 1000]

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const OUT = flag('out', '.shots/harvester')
const WIDTH = Number(flag('width', 1600))
const HEIGHT = Number(flag('height', 1000))
const PORT = Number(flag('port', 5220))

// azimuth 0 looks up the nose, 90 is the starboard flank, elevation 90 is
// straight down. Distance is in machine lengths (OVERALL.length = 60m).
// NEGATIVE azimuths on purpose: the sun sits off the machine's port side
// (main.ts), so the lit flank is the one to photograph.
//
// More angles than the bar needs: the bar's primary is `hero`; the rest are
// for the user's eye and the eventual artifact page. Filter with --views.
const VIEWS = [
  { name: 'hero', az: -42, el: 22, dist: 1.6 },
  { name: 'hero2', az: -30, el: 12, dist: 1.3 },
  { name: 'side', az: -90, el: 4, dist: 1.7 },
  { name: 'front', az: 0, el: 5, dist: 1.6 },
  { name: 'frontlow', az: 0, el: 2, dist: 0.9 },
  { name: 'rear', az: 180, el: 6, dist: 1.7 },
  { name: 'rear34', az: -135, el: 14, dist: 1.6 },
  { name: 'top', az: 0, el: 88, dist: 1.7 },
  { name: 'tracks', az: -90, el: 3, dist: 0.55 },
  { name: 'boom', az: -18, el: 5, dist: 1.0 },
]

// --views hero,side  -> only those, in that order; absent means all.
const rawFilter = flag('views', '')
const VIEW_FILTER = rawFilter
  ? rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  : null
const views = VIEW_FILTER ? VIEWS.filter((v) => VIEW_FILTER.includes(v.name)) : VIEWS

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const alive = await fetch(`http://127.0.0.1:${PORT}/`, { method: 'GET' })
  .then((r) => r.ok)
  .catch(() => false)

let server = null
const kill = () => {
  if (!server) return
  try {
    server.kill('SIGTERM')
  } catch {
    /* already gone */
  }
}
process.on('exit', kill)

if (alive) {
  console.log(`attaching to the dev server already on :${PORT}`)
} else {
  server = spawn('npx', ['vite', 'vehicle-shop/harvester', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
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
}

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

// Measure at a DEFINED pose: parked at the origin, facing -Z, wings... pods
// at rest. Measuring whatever frame the sim happened to be on is meaningless
// for a crawler only if it was moving; parked is parked.
const measurement = await page.evaluate(() => {
  window.__HARVESTER__.pose(0, 0, 0)
  return window.__HARVESTER__.measure()
})

const manifest = { width: WIDTH, height: HEIGHT, measurement, views: [], errors }

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

await page.evaluate(() => window.__HARVESTER__.resume())
await browser.close()
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
if (errors.length) {
  console.error('page errors:', errors)
  process.exitCode = 1
} else {
  console.log(`captured ${views.length} views to ${OUT}`)
}
