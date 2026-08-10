// landscape-shop/cliff/tools/probe.mjs
// Measure the RENDERED frame. R2's first pass was rejected for being
// sub-threshold on screen while every data-level guard was green, so this
// round's numbers come from the PNG the critic is shown.
//
//   node tools/probe.mjs bands  [shotsDir]        adjacent band deltas, per mass
//   node tools/probe.mjs mouth  [shotsDir]        the gate's interior read
//   node tools/probe.mjs prow   [shotsDir]        edge evidence on the prow
//   node tools/probe.mjs box    <png> x0 y0 x1 y1
//
// Bands are read down a VERTICAL run of pixels: the bedding is near
// horizontal, so an image ROW runs along one band and could not see a step.

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { readPng, luminanceAt, rgbAt } from './png.mjs'
import { projector, rasterize, memberProfile, mean } from './probeMass.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PRIMARIES = ['heroButtress', 'eastBastion', 'westBastion', 'midRise', 'northSummit', 'eastTail']

const [command, ...rest] = process.argv.slice(2)
const shots = join(HERE, '..', rest[0] && !rest[0].endsWith('.png') ? rest[0] : '.shots')
const load = (name) => readPng(join(shots, `${name}.png`))
const manifest = () => JSON.parse(readFileSync(join(shots, 'manifest.json'), 'utf8'))
const round = (value) => Math.round(value * 10) / 10

function boxStats(image, x0, y0, x1, y1, keep = () => true) {
  let n = 0
  let sum = 0
  let low = Infinity
  let high = -Infinity
  const channel = [0, 0, 0]
  for (let y = Math.max(0, y0); y <= Math.min(image.height - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(image.width - 1, x1); x++) {
      const pixel = rgbAt(image, x, y)
      if (!keep(pixel)) continue
      const lum = luminanceAt(image, x, y)
      n++
      sum += lum
      if (lum < low) low = lum
      if (lum > high) high = lum
      for (let k = 0; k < 3; k++) channel[k] += pixel[k]
    }
  }
  if (!n) return { count: 0 }
  return {
    count: n,
    mean: round(sum / n),
    min: round(low),
    max: round(high),
    rgb: channel.map((total) => round(total / n)),
    warmth: round(channel[0] / Math.max(channel[2], 1)),
  }
}

function bands() {
  const shot = manifest()
  const image = load('approach')
  const bake = JSON.parse(readFileSync(join(HERE, '..', 'src/model/massifBake.json'), 'utf8'))
  const project = projector(shot.rigs.approach, image.width, image.height)
  console.log('sky check (should be near 201,160,108):', rgbAt(image, 40, 40).join(','))
  const raster = rasterize(bake, image, project)
  const all = []
  for (const name of PRIMARIES) {
    const { pixels, members, deltas } = memberProfile(bake, image, raster, name)
    all.push(...deltas)
    const means = members.map((band) => `${band.member}:${round(band.mean)}`).join(' ')
    console.log(`${name.padEnd(14)} px=${String(pixels).padStart(6)} members=${members.length}`
      + ` deltas=[${deltas.map(round).join(' ')}] min=${round(Math.min(...deltas))}\n`
      + `               means=[${means}]`)
  }
  console.log(`ALL adjacent-member deltas: n=${all.length} min=${round(Math.min(...all))}`
    + ` mean=${round(mean(all))} under12=${all.filter((delta) => delta < 12).length}`)
}

// The gate's aperture, swept in WORLD height. model/socket.ts's inner lip is
// a 20 x 12 oval about y = 13 on the set's own frontmost plane, so each world
// course of the mouth maps to a known run of pixels — which is what turns
// "the mouth is black" into "the strip at y = 4 renders 27/255 over 40 px".
const MOUTH = { halfW: 20, halfH: 12, centreY: 13, z: -219.5 }

function mouthRun(project, y, shrink) {
  const across = 1 - ((y - MOUTH.centreY) / MOUTH.halfH) ** 2
  if (across <= 0.02) return null
  const half = MOUTH.halfW * Math.sqrt(across) * shrink
  const left = project([half, y, MOUTH.z])
  const right = project([-half, y, MOUTH.z])
  if (!left || !right) return null
  return { row: Math.round((left.y + right.y) / 2), from: Math.round(left.x), to: Math.round(right.x) }
}

function mouth() {
  const project = projector(manifest().rigs.landing, 1600, 900)
  const image = load('landing')
  console.log('worldY   row   px   mean  min  max   r,g,b            r/b')
  let strip = 0
  for (let y = 0; y <= 26; y += 2) {
    const run = mouthRun(project, y, 0.8)
    if (!run) continue
    const stats = boxStats(image, run.from, run.row, run.to, run.row)
    if (stats.count && stats.mean < 60) strip += stats.count
    console.log(`${String(y).padStart(5)} ${String(run.row).padStart(5)} ${String(stats.count).padStart(4)}`
      + `  ${String(stats.mean).padStart(5)} ${String(stats.min).padStart(4)} ${String(stats.max).padStart(4)}`
      + `   ${String(stats.rgb).padEnd(16)} ${stats.warmth}`)
  }
  console.log(`interior pixels under 60/255 across the sweep: ${strip}`)
  const mid = mouthRun(project, 13, 1.35)
  console.log('rock LEFT of mouth :', JSON.stringify(boxStats(image, mid.from - 130, mid.row - 90, mid.from - 20, mid.row + 90)))
  console.log('rock RIGHT of mouth:', JSON.stringify(boxStats(image, mid.to + 20, mid.row - 90, mid.to + 130, mid.row + 90)))
}

/** Edge evidence: how hard the hardest local step is, and how many pixels
 *  carry a real step at all. An airbrushed gradient scores near zero on both;
 *  faceted rock scores tens. */
function prow() {
  const image = load('landing')
  for (const [label, x0, y0, x1, y1] of [['left-prow', 40, 40, 620, 560], ['whole-left', 0, 0, 800, 700]]) {
    const steps = []
    for (let y = y0; y <= y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        steps.push(Math.abs(luminanceAt(image, x + 2, y) - luminanceAt(image, x, y)))
      }
    }
    steps.sort((a, b) => a - b)
    const pick = (q) => round(steps[Math.floor(steps.length * q)])
    console.log(`${label.padEnd(11)} n=${steps.length} p50=${pick(0.5)} p90=${pick(0.9)}`
      + ` p99=${pick(0.99)} max=${round(steps[steps.length - 1])}`
      + ` over6=${round((100 * steps.filter((s) => s > 6).length) / steps.length)}%`)
  }
}

if (command === 'bands') bands()
else if (command === 'mouth') mouth()
else if (command === 'prow') prow()
else if (command === 'box') {
  const [file, ...numbers] = rest
  console.log(JSON.stringify(boxStats(readPng(file), ...numbers.map(Number))))
} else throw new Error(`probe: unknown command ${command}`)
