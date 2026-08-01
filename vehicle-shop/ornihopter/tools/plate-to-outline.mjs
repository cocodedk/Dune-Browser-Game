// vehicle-shop/ornihopter/tools/plate-to-outline.mjs
// Convert a flat printed plate from docs/ into a measured 2D outline: JSON for
// geometry code to loft from, and SVG for the blueprint.
//
// The kit's parts are ~1.8mm extrusions of a profile someone actually drew, so
// this recovers that drawing. Two limits worth stating up front:
//   - There is NO absolute scale in the kit. Output is normalised 0..1 along
//     the long axis and expressed as a fraction of max width, to be scaled to
//     src/spec.ts's real dimensions by whoever consumes it.
//   - It only makes sense on plates that are genuine silhouettes. Several kit
//     parts are internal ribs with joinery slots cut into them, and tracing
//     those yields the slots, not the craft.
//
// Usage: node plate-to-outline.mjs <file.stl> <name> [--stations 120] [--out DIR]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'

const [file, name, ...flags] = process.argv.slice(2)
const num = (k, d) => {
  const i = flags.indexOf(`--${k}`)
  return i >= 0 ? Number(flags[i + 1]) : d
}
const str = (k, d) => {
  const i = flags.indexOf(`--${k}`)
  return i >= 0 ? flags[i + 1] : d
}
const STATIONS = num('stations', 120)
const OUT = str('out', 'vehicle-shop/ornihopter/docs/profiles')

const buf = readFileSync(file)
const count = buf.readUInt32LE(80)
const tri = []
for (let i = 0; i < count; i++) {
  const o = 84 + i * 50 + 12
  tri.push([0, 1, 2].map((k) => [
    buf.readFloatLE(o + k * 12),
    buf.readFloatLE(o + k * 12 + 4),
    buf.readFloatLE(o + k * 12 + 8),
  ]))
}

const lo = [Infinity, Infinity, Infinity]
const hi = [-Infinity, -Infinity, -Infinity]
for (const t of tri) for (const p of t) for (let a = 0; a < 3; a++) {
  if (p[a] < lo[a]) lo[a] = p[a]
  if (p[a] > hi[a]) hi[a] = p[a]
}
// Plate plane is the two largest axes; the smallest is the extrusion thickness.
const axes = [0, 1, 2].map((a) => [a, hi[a] - lo[a]]).sort((x, y) => y[1] - x[1])
const [U, uLen] = axes[0]
const [V, vLen] = axes[1]
const thickness = axes[2][1]

const insideAt = (pu, pv) => {
  for (const t of tri) {
    const ax = t[0][U], ay = t[0][V]
    const bx = t[1][U], by = t[1][V]
    const cx = t[2][U], cy = t[2][V]
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if (Math.abs(d) < 1e-12) continue
    const w1 = ((by - cy) * (pu - cx) + (cx - bx) * (pv - cy)) / d
    const w2 = ((cy - ay) * (pu - cx) + (ax - cx) * (pv - cy)) / d
    if (w1 >= -1e-9 && w2 >= -1e-9 && 1 - w1 - w2 >= -1e-9) return true
  }
  return false
}

// Upper and lower edge at each station along the long axis. Adequate for an
// elongated single-lobe silhouette like a wing; it would flatten a shape that
// doubles back on itself, which is another reason not to run it on ribs.
const RESOLUTION = 600
const stations = []
for (let s = 0; s < STATIONS; s++) {
  const frac = s / (STATIONS - 1)
  const pu = lo[U] + uLen * frac
  let min = Infinity
  let max = -Infinity
  for (let k = 0; k <= RESOLUTION; k++) {
    const pv = lo[V] + (vLen * k) / RESOLUTION
    if (!insideAt(pu, pv)) continue
    if (pv < min) min = pv
    if (pv > max) max = pv
  }
  if (min === Infinity) continue
  stations.push({ frac, lower: min - lo[V], upper: max - lo[V] })
}

const maxWidth = Math.max(...stations.map((s) => s.upper - s.lower))
const mid = stations.map((s) => (s.upper + s.lower) / 2)
const midMean = mid.reduce((a, b) => a + b, 0) / mid.length

const profile = {
  source: basename(file),
  note:
    'Measured off a flat plate in the print kit. NO ABSOLUTE SCALE: the kit states no ' +
    'scale ratio, so span is normalised 0..1 and widths are a fraction of max width. ' +
    'Scale to src/spec.ts before use.',
  plateMillimetres: { long: uLen, across: vLen, thickness },
  lengthOverMaxWidth: uLen / maxWidth,
  stations: stations.map((s) => ({
    span: Number(s.frac.toFixed(5)),
    // Chord fraction, and the camber line's offset from the plate's mid-line,
    // so a loft can reproduce the sweep rather than only the width.
    chord: Number(((s.upper - s.lower) / maxWidth).toFixed(5)),
    offset: Number((((s.upper + s.lower) / 2 - midMean) / maxWidth).toFixed(5)),
  })),
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, `${name}.json`), JSON.stringify(profile, null, 2))

// SVG in real plate millimetres, for the blueprint. Drawn as one closed path:
// forward along the upper edge, back along the lower.
const W = uLen
const H = vLen
const pad = Math.max(W, H) * 0.06
const up = stations.map((s) => `${(s.frac * W).toFixed(3)},${(H - s.upper).toFixed(3)}`)
const down = [...stations].reverse().map((s) => `${(s.frac * W).toFixed(3)},${(H - s.lower).toFixed(3)}`)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}" width="${(W * 4).toFixed(0)}" height="${(H * 4).toFixed(0)}">
  <title>${name} — measured from ${basename(file)}</title>
  <rect x="${-pad}" y="${-pad}" width="${W + pad * 2}" height="${H + pad * 2}" fill="#0d1b2a"/>
  <path d="M ${up.join(' L ')} L ${down.join(' L ')} Z"
        fill="none" stroke="#8ecae6" stroke-width="${(Math.max(W, H) * 0.0016).toFixed(3)}"/>
  <line x1="0" y1="${(H - midMean).toFixed(3)}" x2="${W}" y2="${(H - midMean).toFixed(3)}"
        stroke="#48607a" stroke-width="${(Math.max(W, H) * 0.0008).toFixed(3)}" stroke-dasharray="4 3"/>
</svg>
`
writeFileSync(join(OUT, `${name}.svg`), svg)

console.log(`${name}: plate ${uLen.toFixed(2)} x ${vLen.toFixed(2)} x ${thickness.toFixed(2)}mm`)
console.log(`  length/maxWidth ${(uLen / maxWidth).toFixed(2)}   ${stations.length} stations`)
console.log(`  -> ${join(OUT, `${name}.json`)}`)
console.log(`  -> ${join(OUT, `${name}.svg`)}`)
