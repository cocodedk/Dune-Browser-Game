// landscape-shop/sietch/tools/bake/paint.mjs
// Turns each surviving triangle's SOURCE colour into a tone index, in two
// passes over the piece.
//
//   pass 1  read every triangle's source colour, decide which family it
//           belongs to (foliage / water / char / the piece's own ramp) and
//           record its luminance
//   pass 2  rank that luminance WITHIN ITS OWN FAMILY and look the rank up
//           on the family's PALETTE-derived ramp
//
// Ranking per family, not per piece, is what keeps a palm's trunk from
// flattening its own fronds: the trunk is darker than every frond, so a
// single piece-wide ranking would push the whole crown to the light end
// of one ramp and lose the shading the kit modelled into it. Ranked
// separately, the trunk uses all three wood stops and the crown uses all
// three frond stops.
//
// The output is an INDEX per triangle into a shared tone table, not a
// colour. That keeps the committed bake small, and it means
// src/dressing.test.ts can check the whole set's palette by walking a
// table of a few dozen entries instead of tens of thousands of floats.

import { familyOf, linearToSrgb, luminanceOf, rampAt } from './tones.mjs'

// Ramp positions are quantised to this many steps before they become tone
// table entries: 24 steps is finer than a flat-shaded facet under one
// point light can show, and it caps the table at a size a test can read.
const RAMP_STEPS = 24

export function paintTriangles(soup, triangles, mainRamp, foliageRamp, tones, toneRange) {
  const [lift, drop] = toneRange ?? [0, 1]
  const reads = triangles.map(({ source }) => {
    const srgb = [0, 1, 2].map((c) => linearToSrgb(soup.colors[source * 3 + c]))
    return { family: familyOf(srgb, mainRamp, foliageRamp), lum: luminanceOf(...srgb) }
  })

  const span = new Map()
  for (const { family, lum } of reads) {
    const range = span.get(family) ?? { lo: Infinity, hi: -Infinity }
    range.lo = Math.min(range.lo, lum)
    range.hi = Math.max(range.hi, lum)
    span.set(family, range)
  }

  return reads.map(({ family, lum }) => {
    const { lo, hi } = span.get(family)
    // A family with one flat colour sits in the MIDDLE of its ramp, not
    // at an arbitrary end — the kit's single-tone parts (a plain sack, a
    // clay lid) should read as that material's typical value.
    const t = hi - lo < 1e-4 ? 0.5 : (lum - lo) / (hi - lo)
    // toneRange narrows which slice of the ramp a piece may use. It is a
    // LIGHTING tool, not a colour one: within ~5 m of the hearth a
    // point light at 300 candela clips any albedo above about 0.1, so a
    // pale mat there renders as a sheet of paper. Measured, then fixed by
    // pushing those pieces into the dark end of their own ramp.
    const ranged = lift + t * (drop - lift)
    return toneIndex(tones, rampAt(family, Math.round(ranged * RAMP_STEPS) / RAMP_STEPS))
  })
}

/** Adds a hex to the shared table if it is new, and returns its index.
 *  Insertion order is a pure function of the piece order, so the table is
 *  byte-identical run to run. */
function toneIndex(tones, hex) {
  const at = tones.indexOf(hex)
  if (at >= 0) return at
  tones.push(hex)
  return tones.length - 1
}
