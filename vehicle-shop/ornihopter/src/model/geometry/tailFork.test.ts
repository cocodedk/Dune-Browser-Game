// vehicle-shop/ornihopter/src/model/geometry/tailFork.test.ts
// Round 6a's tail guard, measured off Horizontal_tail.stl rather than off a
// photograph. Scanning the de-rotated plate station by station (the same
// pipeline docs/profiles/boom-plan.json came from) the aft third reads, per
// side of the centreline:
//
//   x < 91.5mm      one band, the solid blade
//   x 92 .. 108.4   TWO bands, 5.04..7.06mm and 0.99..3.04mm, separated by a
//                   2.00mm through-slot at 3.04..5.04mm
//   x > 109         the outer band is gone; only 0.99..3.04mm continues
//   x 129.5         that survivor narrows to 1.44..2.71 and ends at 129.64
//
// So the blade forks at 71% of its own length into an OUTER tine that stops
// squared at 84% and an INNER tine that runs all the way to the tip and
// blunts to a point, with a real lightening slot between them. That is
// kit-dossier.md section d's "fork whose two tines are each of the other two",
// measured to the tenth of a millimetre.
//
// The pre-round hullTailFork.ts built two MIRROR tines instead: both spanning
// 20.15..22.80m aft, both tapering to a 0.02m point, no slot, no squared end
// — a fluted needle, not a fork. These assertions are what that could not pass.

import { describe, it, expect } from 'vitest'
import { buildTailFork } from './hullTailFork'
import { HALF_LENGTH } from '../../spec'

interface Band {
  lo: number
  hi: number
}

interface TineMetrics {
  side: number
  /** |x| band per ring station, so the slot can be measured where the fork is
   *  actually open rather than over the tine's whole reach. */
  bands: Map<number, Band>
  aftMost: number
  foreMost: number
  innerX: number
  outerX: number
  /** Half-width of the tine's own aft-most ring, over its widest ring. */
  endBluntness: number
}

function measure(): TineMetrics[] {
  return buildTailFork().map((mesh) => {
    let aftMost = -Infinity
    let foreMost = Infinity
    let innerX = Infinity
    let outerX = 0
    let sumX = 0
    let count = 0
    // Ring half-width per z, so "how squared is the end" is a real measurement
    // of the terminal section rather than of a bounding box.
    const spanByZ = new Map<string, { lo: number; hi: number }>()
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i]
      const z = mesh.positions[i + 2]
      const aft = z + HALF_LENGTH
      aftMost = Math.max(aftMost, aft)
      foreMost = Math.min(foreMost, aft)
      innerX = Math.min(innerX, Math.abs(x))
      outerX = Math.max(outerX, Math.abs(x))
      sumX += x
      count += 1
      const key = aft.toFixed(3)
      const cur = spanByZ.get(key) ?? { lo: Infinity, hi: -Infinity }
      spanByZ.set(key, { lo: Math.min(cur.lo, x), hi: Math.max(cur.hi, x) })
    }
    const widths = [...spanByZ].map(([k, v]) => ({ aft: Number(k), width: v.hi - v.lo }))
    const widest = Math.max(...widths.map((w) => w.width))
    const terminal = widths.reduce((a, b) => (b.aft > a.aft ? b : a))
    const bands = new Map<number, Band>()
    for (const [k, v] of spanByZ) {
      bands.set(Number(k), { lo: Math.min(Math.abs(v.lo), Math.abs(v.hi)), hi: Math.max(Math.abs(v.lo), Math.abs(v.hi)) })
    }
    return {
      side: Math.sign(sumX / count),
      bands,
      aftMost,
      foreMost,
      innerX,
      outerX,
      endBluntness: widest > 0 ? terminal.width / widest : 0,
    }
  })
}

/** The tine's |x| band at an aft station, interpolated between its own rings.
 *  Null if the tine does not reach that station at all. */
function bandAt(tine: TineMetrics, aft: number): Band | null {
  const stations = [...tine.bands.keys()].sort((a, b) => a - b)
  if (aft < stations[0] - 1e-6 || aft > stations[stations.length - 1] + 1e-6) return null
  for (let i = 0; i < stations.length - 1; i++) {
    if (aft > stations[i + 1] + 1e-6) continue
    const a = tine.bands.get(stations[i]) as Band
    const b = tine.bands.get(stations[i + 1]) as Band
    const span = stations[i + 1] - stations[i]
    const t = span === 0 ? 0 : (aft - stations[i]) / span
    return { lo: a.lo + (b.lo - a.lo) * t, hi: a.hi + (b.hi - a.hi) * t }
  }
  return tine.bands.get(stations[stations.length - 1]) as Band
}

describe('the boom ends in the measured two-tine fork', () => {
  const tines = measure()

  it('carries a short tine and a long tine, not two mirror copies', () => {
    const reaches = [...new Set(tines.map((t) => Number(t.aftMost.toFixed(2))))].sort((a, b) => a - b)
    console.log(`[fork] distinct tine reaches: ${reaches.map((r) => `${r}m`).join(', ')} aft`)
    expect(reaches.length).toBeGreaterThanOrEqual(2)
    expect(reaches[reaches.length - 1] - reaches[0]).toBeGreaterThanOrEqual(1.5)
  })

  it('ends the short tine squared, as a paddle, not tapered to a needle', () => {
    const short = tines.reduce((a, b) => (b.aftMost < a.aftMost ? b : a))
    console.log(`[fork] short tine ends at ${short.aftMost.toFixed(2)}m aft, bluntness ${short.endBluntness.toFixed(2)}`)
    expect(short.endBluntness).toBeGreaterThanOrEqual(0.5)
  })

  it('runs the long tine to a point at the very tail', () => {
    const long = tines.reduce((a, b) => (b.aftMost > a.aftMost ? b : a))
    console.log(`[fork] long tine ends at ${long.aftMost.toFixed(2)}m aft, bluntness ${long.endBluntness.toFixed(2)}`)
    expect(long.aftMost).toBeGreaterThan(22.4)
    expect(long.endBluntness).toBeLessThan(0.45)
  })

  it('leaves a real lightening slot between the tines on each side', () => {
    // Measured where the fork is fully open — at the short tine's own aft end
    // — not over each tine's whole extent. Tines MEET at the fork root by
    // definition, so a whole-extent comparison reports an overlap on a
    // perfectly good fork; the slot is a property of the overlap zone.
    const short = tines.reduce((a, b) => (b.aftMost < a.aftMost ? b : a))
    for (const side of [1, -1]) {
      const own = tines.filter((t) => t.side === side)
      expect(own.length).toBeGreaterThanOrEqual(2)
      const bands = own
        .map((t) => bandAt(t, short.aftMost))
        .filter((b): b is Band => b !== null)
        .sort((a, b) => a.lo - b.lo)
      expect(bands.length).toBe(2)
      const gap = bands[1].lo - bands[0].hi
      console.log(
        `[fork] side ${side} at ${short.aftMost.toFixed(2)}m aft: inner |x| to ` +
        `${bands[0].hi.toFixed(3)}m, outer from ${bands[1].lo.toFixed(3)}m, slot ${gap.toFixed(3)}m`,
      )
      expect(gap).toBeGreaterThanOrEqual(0.15)
    }
  })
})
