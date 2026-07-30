// scripts/shoot.mjs
// Capture the game in every scene mode, at several hours, at a fixed size.
//
// This exists so visual judgement is made against actual frames instead of
// against a description of them. Output lands in .shots/ (gitignored) with a
// manifest recording the mode and render cost of each frame, so a reviewer can
// say "this one is dark" and also see it cost 41 draw calls.
//
// Usage:  node scripts/shoot.mjs [--width 3440] [--height 1440] [--out .shots]

import { chromium } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import * as M from './shootModes.mjs'

const args = process.argv.slice(2)
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const WIDTH = Number(flag('width', 1920))
const HEIGHT = Number(flag('height', 1080))
const OUT = flag('out', '.shots')
// ?debug=1 is required: shouldAttachDebug() only exposes window.__DUNE__ in dev
// builds or when explicitly asked for, so a production bundle stays clean. The
// harness drives the game entirely through that handle, so without the flag it
// waits forever for a handle that is never going to arrive.
const URL = flag('url', 'http://127.0.0.1:4173/?debug=1')

// The hours worth judging: the low sun that shows relief, the flat overhead
// light that hides it, and the night palette.
//
// These are SOLVED from the renderer, not guessed. Atmosphere.ts computes
// sunElevation = -cos((time/DAY_SECONDS + DAY_START_FRACTION) * 2PI) with
// DAY_START_FRACTION = 0.36, so the clock is offset by well over a third of a
// day: naming t=30 "noon" is wrong, it is midnight. Guessed labels sent me
// chasing an inverted-lighting bug that did not exist, so each entry below
// records the elevation it actually produces.
const DAY_SECONDS = 60
const DAY_START_FRACTION = 0.36

/** Engine time at which the sun reaches a given phase of its arc. */
function timeAtPhase(phase) {
  const t = (phase - DAY_START_FRACTION) * DAY_SECONDS
  return ((t % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS
}

const HOURS = [
  { name: 'dawn', at: timeAtPhase(0.25), elevation: 0 },      // sun on the horizon, rising
  { name: 'noon', at: timeAtPhase(0.5), elevation: +1 },      // straight overhead
  { name: 'dusk', at: timeAtPhase(0.75), elevation: 0 },      // sun on the horizon, falling
  { name: 'midnight', at: timeAtPhase(0), elevation: -1 },    // fully dark
]

const manifest = []

async function shoot(page, name, note) {
  const cost = await M.renderCost(page)
  const file = `${name}.png`
  await page.screenshot({ path: join(OUT, file), animations: 'disabled' })
  manifest.push({ file, mode: cost.mode, calls: cost.calls, triangles: cost.triangles, note })
  console.log(
    `  ${file.padEnd(34)} mode=${String(cost.mode).padEnd(12)} ` +
    `calls=${String(cost.calls).padStart(4)} tris=${cost.triangles}`,
  )
}

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  })
  page.on('pageerror', e => console.error(`  PAGE ERROR: ${e.message}`))
  page.on('console', m => {
    if (m.type() === 'error') console.error(`  CONSOLE ERROR: ${m.text()}`)
  })

  console.log(`\n${WIDTH}x${HEIGHT} -> ${OUT}/\n`)
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await M.waitForGame(page)
  await M.populateWorld(page)
  await M.settle(page, 18)

  const canvas = page.locator('#scene-container canvas')

  console.log('strategic (orbit):')
  for (const h of HOURS) {
    await M.setTime(page, h.at)
    await M.settle(page, 10)
    await shoot(page, `strategic-${h.name}`, `globe at ${h.name} (t=${h.at.toFixed(1)}, sun ${h.elevation})`)
  }

  console.log('\nsurface (descended):')
  const surfaceMode = await M.descend(page, canvas)
  if (surfaceMode === 'surface') {
    for (const h of HOURS) {
      await M.setTime(page, h.at)
      await M.settle(page, 10)
      await shoot(page, `surface-${h.name}`, `dune field at ${h.name} (t=${h.at.toFixed(1)}, sun ${h.elevation})`)
    }
  } else {
    console.log(`  SKIPPED — descent landed in "${surfaceMode}", not surface`)
    manifest.push({ file: null, mode: surfaceMode, note: 'descent did not reach surface' })
  }

  console.log('\nconversation:')
  // Two characters who should look nothing alike: a Fremen naib and the Baron.
  for (const [who, village] of [['stilgar', 'red_wall_sietch'], ['baron', 'carthag']]) {
    const mode = await M.talkAt(page, village)
    if (mode === 'conversation' || mode === 'location') {
      await M.setTime(page, 30)
      await shoot(page, `conversation-${who}`, `${who} at ${village} (${mode})`)
    } else {
      console.log(`  SKIPPED ${who} — landed in "${mode}"`)
      manifest.push({ file: null, mode, note: `talkAt(${village}) did not open a conversation` })
    }
    await M.escape(page)
  }

  await writeFile(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await browser.close()

  const captured = manifest.filter(m => m.file).length
  const skipped = manifest.filter(m => !m.file).length
  console.log(`\n${captured} frames captured, ${skipped} skipped -> ${OUT}/manifest.json\n`)
  if (captured === 0) process.exitCode = 1
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
