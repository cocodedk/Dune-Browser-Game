// character-shop/chani/tools/shoot.mjs
// Capture Chani at the seven named views the R1 harness contract requires,
// at fixed poses so a critic judges frames, not a description of frames,
// and two runs of the same view are the same image. VIEWS and the dev-
// server bring-up live in ./views.mjs and ./devServer.mjs — the harvester
// shop's tools/ split, adapted (character-shop/docs/gauntlet-loop.md: never
// imported across shops, this copy is chani's own).
//
// Usage:
//   node character-shop/chani/tools/shoot.mjs [--out .shots] [--views front,bust]

import { chromium } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { filterViews } from './views.mjs'
import { ensureDevServer } from './devServer.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
// Resolved off this file's own path, not the CWD, so the shots always land
// in character-shop/chani/.shots regardless of where `node` was invoked.
const OUT = join(HERE, '..', flag('out', '.shots'))
const WIDTH = Number(flag('width', 1200))
const HEIGHT = Number(flag('height', 1600))
const PORT = Number(flag('port', 5230))
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
await page.waitForFunction(() => Boolean(window.__CHANI__), null, { timeout: 30000 })
await page.waitForTimeout(400)

const measurement = await page.evaluate(() => window.__CHANI__.measure())
const manifest = { width: WIDTH, height: HEIGHT, measurement, views: [], errors }

for (const view of views) {
  await page.evaluate(
    ([az, el, dist, targetY, silhouette]) => {
      window.__CHANI__.viewpoint(az, el, dist, targetY)
      window.__CHANI__.setSilhouette(Boolean(silhouette))
    },
    [view.az, view.el, view.dist, view.targetY, Boolean(view.silhouette)],
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
