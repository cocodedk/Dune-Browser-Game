// landscape-shop/sietch/tools/shoot.mjs
// Capture the sietch set at its four R1 evidence views (rig, rig-clay,
// drift-left, drift-right — see ./views.mjs), through the exact
// CAMERA_RIG spec.ts names. The dev-server bring-up and view table live in
// ./devServer.mjs and ./views.mjs — character-shop/chani's tools/ split,
// adapted (landscape-shop/docs/gauntlet-loop.md: never imported across
// shops, this copy is sietch's own).
//
// The rig numbers used for every frame are recorded in
// .shots/manifest.json, read back from the BROWSER (window.__SIETCH__.rig()),
// so a capture is reproducible from the manifest alone.
//
// Usage:
//   node landscape-shop/sietch/tools/shoot.mjs [--out .shots] [--views rig,rig-clay]

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
// Resolved off this file's own path, not the CWD, so shots always land in
// landscape-shop/sietch/.shots regardless of where `node` was invoked.
const OUT = join(HERE, '..', flag('out', '.shots'))
// 1.6 aspect: the frame paintDiorama.ts (the set this replaces) is
// authored at — landscape-shop/docs/gauntlet-loop.md's sietch row.
const WIDTH = Number(flag('width', 1600))
const HEIGHT = Number(flag('height', 1000))
const PORT = Number(flag('port', 5250))
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
await page.waitForFunction(() => Boolean(window.__SIETCH__), null, { timeout: 30000 })
await page.waitForTimeout(400)

const measurement = await page.evaluate(() => window.__SIETCH__.measure())
const rig = await page.evaluate(() => window.__SIETCH__.rig())
const manifest = { width: WIDTH, height: HEIGHT, measurement, rig, views: [], errors }

for (const view of views) {
  await page.evaluate(
    ([cameraX, clay]) => {
      window.__SIETCH__.setClay(Boolean(clay))
      window.__SIETCH__.setCameraX(cameraX)
    },
    [view.cameraX, view.clay],
  )
  await page.waitForTimeout(200)
  const file = join(OUT, `${view.name}.png`)
  await page.screenshot({ path: file })
  manifest.views.push({ ...view, file })
}

await browser.close()
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))

// EXPLICIT TEARDOWN, THEN AN EXPLICIT EXIT. Both halves are load-bearing.
// `npx vite` spawns a SHELL that spawns node, so SIGTERM to the child kills
// npx and orphans vite holding the port; killing the whole process GROUP is
// what actually frees it. And even with the port free, node would not exit:
// the spawned child's piped stdio streams stay referenced on the event loop,
// so this script ran to completion and then hung forever. Every caller was
// wrapping it in `timeout`, which is a workaround for a bug, and a
// `timeout`-killed capture cannot be told from a crashed one.
kill()
if (errors.length) {
  console.error('page errors:', errors)
  process.exit(1)
}
console.log(`captured ${manifest.views.length} views to ${OUT}`)
process.exit(0)
