// character-shop/duncan/tools/shoot.mjs
// Capture Duncan at the nine named views the harness contract requires —
// R1's seven, plus R2's headfront and headthreequarter,
// at fixed poses so a critic judges frames, not a description of frames,
// and two runs of the same view are the same image. VIEWS and the dev-
// server bring-up live in ./views.mjs and ./devServer.mjs — adapted from
// vehicle-shop/harvester/tools/ (read as reference only, never imported —
// the fence forbids cross-shop imports even from tooling; this copy is
// duncan's own).
//
// Usage:
//   node character-shop/duncan/tools/shoot.mjs [--out .shots] [--views front,bust]

import { chromium } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { filterViews, PORTRAIT_RIG } from './views.mjs'
import { ensureDevServer } from './devServer.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
// Resolved off this file's own path, not the CWD, so the shots always land
// in character-shop/duncan/.shots regardless of where `node` was invoked.
const OUT = join(HERE, '..', flag('out', '.shots'))
// Portrait: a standing human figure, not a wide machine.
const WIDTH = Number(flag('width', 1200))
const HEIGHT = Number(flag('height', 1600))
const PORT = Number(flag('port', 5240))
const views = filterViews(flag('views', ''))

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
await page.waitForFunction(() => Boolean(window.__DUNCAN__), null, { timeout: 30000 })
await page.waitForTimeout(400)

const measurement = await page.evaluate(() => window.__DUNCAN__.measure())
const manifest = { width: WIDTH, height: HEIGHT, measurement, portraitRig: PORTRAIT_RIG, views: [], errors }

for (const view of views) {
  // Order is load-bearing: viewpoint() first, because the portrait rig's
  // three beams are placed relative to the camera's own azimuth and
  // setPortrait() reads the framing viewpoint() just recorded.
  await page.evaluate(
    ([az, el, dist, targetY, portrait, silhouette]) => {
      window.__DUNCAN__.viewpoint(az, el, dist, targetY)
      window.__DUNCAN__.setPortrait(Boolean(portrait))
      window.__DUNCAN__.setSilhouette(Boolean(silhouette))
    },
    [view.az, view.el, view.dist, view.targetY, Boolean(view.portrait), Boolean(view.silhouette)],
  )
  await page.waitForTimeout(200)
  const file = join(OUT, `${view.name}.png`)
  await page.screenshot({ path: file })
  manifest.views.push({ ...view, file })
}

await browser.close()
kill()
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
if (errors.length) {
  console.error('page errors:', errors)
  process.exitCode = 1
} else {
  console.log(`captured ${manifest.views.length} views to ${OUT}`)
}
