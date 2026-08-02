// vehicle-shop/ornihopter/src/model/geometry/hullFlankCut.ts
// The hole itself: how a lofted bay inside flankWindow.ts's run emits its two
// flanks with a rectangle missing.
//
// WHY A REAL HOLE AND NOT A PANE LAID ON THE SKIN. The hull material is
// FrontSide (model/Ornithopter.ts), so from inside the cabin the skin is
// already absent and the pilot would "see out" through an uncut flank the
// moment the liner opened. From OUTSIDE it would still be solid plate with a
// sheet of glass stuck to it — glazing that reads as a decal, and a pane whose
// own back face is a lit hull panel 8mm behind it. The user asked for panes
// CUT INTO the flanks; this cuts them.
//
// The cut is a rectangle in (station, height) on the flank surface: sill line
// to header line, fore jamb to aft jamb. Above and below it the bay emits
// ordinary lofted strips, so the surface either side of the opening is the
// same skin at the same angle with the same UVs — nothing outside the
// rectangle moves. The hole's fore and aft edges are the planes where the
// window run starts and stops, where the flank is still whole: the opening is
// bounded on all four sides by skin, which is why flankGlazing.ts's trim has
// something to sit against.

import type { LoftMesh } from './hullLoft'
import { RING_SIZE, type Point2 } from './hullCrossSection'
import { flankWindowEdgeAt } from './flankWindow'

/** Ring indices whose panels the cut replaces: 0/1 are the right flank from
 *  chine to deck, 3/4 the left. hullCrossSection.ts's point order. */
export const FLANK_PANELS: ReadonlySet<number> = new Set([0, 1, 3, 4])

interface Corner {
  chine: Point2
  low: Point2
  high: Point2
  deck: Point2
}

const mirror = (p: Point2): Point2 => ({ x: -p.x, y: p.y })

/** The four corners the strips are built from, at one station, or null where
 *  the hull is too shallow to carry the window (flankWindow.ts's own rule). */
function cornersAt(z: number, ring: readonly Point2[]): Corner | null {
  const edge = flankWindowEdgeAt(z)
  if (!edge) return null
  return { chine: ring[0], low: edge.low, high: edge.high, deck: ring[2] }
}

/** True when both ends of the bay can carry the opening. */
export function bayCanCut(zA: number, zB: number): boolean {
  return flankWindowEdgeAt(zA) !== null && flankWindowEdgeAt(zB) !== null
}

/**
 * The four surviving strips of one windowed bay — below and above the opening
 * on each flank — emitted with the exact winding and UV convention
 * hullLoft.ts's own panel loop uses, so a strip is indistinguishable from the
 * panel it replaces except for the piece that is gone.
 */
export function cutFlankBay(
  ringA: readonly Point2[],
  ringB: readonly Point2[],
  zA: number,
  zB: number,
  uA: number,
  uB: number,
): LoftMesh {
  const positions: number[] = []
  const uvs: number[] = []
  const a = cornersAt(zA, ringA)
  const b = cornersAt(zB, ringB)
  if (!a || !b) return { positions, uvs }

  const push = (p: Point2, z: number, u: number, v: number): void => {
    positions.push(p.x, p.y, z)
    uvs.push(u, v)
  }
  /** One strip, in the orientation loftRingsFlat gives panel `k`. */
  const strip = (k: number, aStart: Point2, aEnd: Point2, bStart: Point2, bEnd: Point2): void => {
    const vA = k / RING_SIZE
    const vB = (k + 1) / RING_SIZE
    push(aStart, zA, uA, vA)
    push(aEnd, zA, uA, vB)
    push(bEnd, zB, uB, vB)
    push(aStart, zA, uA, vA)
    push(bEnd, zB, uB, vB)
    push(bStart, zB, uB, vA)
  }

  strip(0, a.chine, a.low, b.chine, b.low)
  strip(1, a.high, a.deck, b.high, b.deck)
  strip(3, mirror(a.deck), mirror(a.high), mirror(b.deck), mirror(b.high))
  strip(4, mirror(a.low), mirror(a.chine), mirror(b.low), mirror(b.chine))
  return { positions, uvs }
}
