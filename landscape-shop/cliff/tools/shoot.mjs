// landscape-shop/cliff/tools/shoot.mjs
// Capture the cliff at its R1 evidence views — the two spec CAMERA_RIGS
// plus a clay pass — through the shop's own dev harness. Adapted from
// character-shop/chani/tools/shoot.mjs (never imported — shops don't
// share code, docs/gauntlet-loop.md); this copy is the cliff shop's own.
//
// Usage:
//   node landscape-shop/cliff/tools/shoot.mjs [--out .shots] [--views approach,landing]

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
// Resolved off this file's own path, not the CWD, so the shots always
// land in landscape-shop/cliff/.shots regardless of where `node` ran.
const OUT = join(HERE, '..', flag('out', '.shots'))
const WIDTH = Number(flag('width', 1600))
const HEIGHT = Number(flag('height', 900))
const PORT = Number(flag('port', 5260))
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
await page.waitForFunction(() => Boolean(window.__CLIFF__), null, { timeout: 30000 })
await page.waitForTimeout(400)

const measurement = await page.evaluate(() => window.__CLIFF__.measure())
// The rig numbers come back from the BROWSER (src/spec.ts CAMERA_RIGS via
// debug.ts), not a node-side copy that could drift.
const rigs = await page.evaluate(() => window.__CLIFF__.rigs())
const manifest = { width: WIDTH, height: HEIGHT, measurement, rigs, views: [], errors }

for (const view of views) {
  await page.evaluate(
    ([rig, clay]) => {
      window.__CLIFF__.setRig(rig)
      window.__CLIFF__.setClay(Boolean(clay))
    },
    [view.rig, Boolean(view.clay)],
  )
  await page.waitForTimeout(200)
  const file = join(OUT, `${view.name}.png`)
  await page.screenshot({ path: file })
  manifest.views.push({ ...view, file })
}

await browser.close()
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))

// EXPLICIT TEARDOWN, THEN AN EXPLICIT EXIT — both load-bearing, see
// devServer.mjs's comment on the process-group kill.
kill()
if (errors.length) {
  console.error('page errors:', errors)
  process.exit(1)
}
console.log(`captured ${manifest.views.length} views to ${OUT}`)
process.exit(0)
