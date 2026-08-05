// character-shop/stilgar/tools/shoot.mjs
// Capture Stilgar from the seven named views R1's harness requires
// (character-shop/docs/gauntlet-loop.md): front, back, left, right,
// threequarter, bust, silhouette. VIEWS and the dev-server bring-up live in
// ./views.mjs and ./devServer.mjs — adapted from vehicle-shop/harvester/
// tools/ (read as reference, never imported: shops stay standalone, no
// cross-shop imports). No randomness anywhere: every view is a fixed
// az/el/dist/targetYFrac triple through debug.ts's viewpoint(), so two runs
// produce byte-identical PNGs.
//
// Usage:
//   node character-shop/stilgar/tools/shoot.mjs [--out character-shop/stilgar/.shots] [--width 1200] [--height 1500] [--views front,bust]

import { chromium } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { filterViews } from './views.mjs'
import { ensureDevServer } from './devServer.mjs'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const OUT = flag('out', 'character-shop/stilgar/.shots')
const WIDTH = Number(flag('width', 1200))
const HEIGHT = Number(flag('height', 1500))
const PORT = Number(flag('port', 5231))

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
await page.waitForFunction(() => Boolean(window.__STILGAR__), null, { timeout: 30000 })
await page.waitForTimeout(400)

// Measured independently of camera pose — geometry only.
const measurement = await page.evaluate(() => window.__STILGAR__.measure())

const manifest = { width: WIDTH, height: HEIGHT, measurement, views: [], errors }

const views = filterViews(flag('views', ''))
for (const view of views) {
  if (view.silhouette) {
    await page.evaluate(() => window.__STILGAR__.setSilhouette(true))
  }
  await page.evaluate(
    ([az, el, dist, targetYFrac]) => window.__STILGAR__.viewpoint(az, el, dist, targetYFrac),
    [view.az, view.el, view.dist, view.targetYFrac],
  )
  await page.waitForTimeout(320)
  const file = join(OUT, `${view.name}.png`)
  await page.screenshot({ path: file })
  manifest.views.push({ ...view, file })
  if (view.silhouette) {
    await page.evaluate(() => window.__STILGAR__.setSilhouette(false))
  }
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
