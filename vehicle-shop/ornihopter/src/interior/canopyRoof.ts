// vehicle-shop/ornihopter/src/interior/canopyRoof.ts
// The roof's SURFACES: the liner bands, the reveal round the window, and the
// inner pane that closes it. Split out of canopyFrame.ts to keep both under
// the repo's 200-line cap; canopyFrame.ts owns the frame members and the
// assembly, canopyLayout.ts owns every position either of them uses.
//
// The two overlap rules below are the round's most expensive lesson, so they
// are stated once here and referenced from both callers: two quads that merely
// SHARE an edge are not watertight to a ray that grazes that edge, and the
// pilot camera casts thousands of such rays. Both junctions in this file
// interpenetrate on purpose.

import { Group } from 'three'
import { deckYAt } from '../model/geometry/canopyPlan'
import { ROOF_DROP, roofYAt, roofHalfWidthAt, apertureHalfWidthAt } from './canopyLayout'
import { box, flatQuad, type Placed } from './sceneUtils'
import {
  hullLinerMaterial, gunmetalMaterial, machinedDarkMaterial, innerGlazingMaterial,
} from './materials'

export interface Band {
  za: number
  zb: number
}

export function bandsOver(zs: readonly number[]): Band[] {
  const bands: Band[] = []
  for (let i = 0; i < zs.length - 1; i++) bands.push({ za: zs[i], zb: zs[i + 1] })
  return bands
}

// MEASURED: at 0.1 the side rails bracketed a window that is already narrow
// over the nose, and the aperture read as several disconnected slots rather
// than one windscreen. 0.06 still catches a highlight and still reads as a
// machined edge.
const RAIL_DEPTH = 0.06
/** ROUND 11, second half of the B6 ruling ("...and thiner frames"): 0.09 ->
 *  0.065. This rail runs down both sides of the forward aperture, so it is
 *  the member that brackets the pilot's own windscreen, and it also sets the
 *  header and brow beams' fore-aft thickness (canopyFrame.ts scales by it).
 *  Thinned against interior/forwardCone.test.ts, which is the guard that says
 *  whether a frame member has walked into the dead-ahead cone. */
export const RAIL_THICKNESS = 0.065

type Sign = 1 | -1
const SIDES: readonly Sign[] = [-1, 1]

const at = (x: number, y: number, z: number): Placed => ({ x, y, z })

/**
 * One band of roof liner. Solid across the full width where the aperture has
 * no half-width at that station; two side bands where it does.
 */
export function roofBand(group: Group, band: Band, material = hullLinerMaterial()): void {
  const { za, zb } = band
  const innerA = apertureHalfWidthAt(za)
  const innerB = apertureHalfWidthAt(zb)
  const outerA = roofHalfWidthAt(za)
  const outerB = roofHalfWidthAt(zb)
  if (outerA <= 0 || outerB <= 0) return
  const yA = roofYAt(za)
  const yB = roofYAt(zb)
  if (innerA <= 0 && innerB <= 0) {
    group.add(
      flatQuad(at(-outerA, yA, za), at(outerA, yA, za), at(outerB, yB, zb), at(-outerB, yB, zb), material)
    )
    return
  }
  for (const sign of SIDES) {
    group.add(
      flatQuad(
        at(sign * innerA, yA, za),
        at(sign * outerA, yA, za),
        at(sign * outerB, yB, zb),
        at(sign * innerB, yB, zb),
        material
      )
    )
  }
}

/**
 * The reveal: the face between the roof liner and the deck skin at the
 * window's edge. It is what stops a shallow ray crawling sideways through the
 * ROOF_DROP gap and out over the canopy panel's edge, and it starts one
 * reveal-height BELOW the liner so the two interpenetrate rather than butt.
 */
export function apertureReveal(group: Group, band: Band): void {
  const material = machinedDarkMaterial()
  const { za, zb } = band
  const a = apertureHalfWidthAt(za)
  const b = apertureHalfWidthAt(zb)
  if (a <= 0 || b <= 0) return
  for (const sign of SIDES) {
    group.add(
      flatQuad(
        at(sign * a, roofYAt(za) - ROOF_DROP, za),
        at(sign * a, deckYAt(za), za),
        at(sign * b, deckYAt(zb), zb),
        at(sign * b, roofYAt(zb) - ROOF_DROP, zb),
        material
      )
    )
    railLoft(group, sign, za, zb)
  }
}

/** How far a loft segment's own float (half of ITS share of the band's total
 *  edge movement, same reasoning as the single-box case one order down) is
 *  allowed to reach before railStationCount below adds another station.
 *  Held under railEdge.test.ts's 0.03m tolerance with headroom for the
 *  curves' own mild non-linearity inside a segment (they are chords, not the
 *  curve itself). */
const RAIL_LOFT_MARGIN = 0.02

/**
 * How many stations a band needs, so no loft segment's own float exceeds
 * RAIL_LOFT_MARGIN. Driven by the band's own SWING (how far the true edge
 * actually moves across it), not a blind distance: a raked span gets as many
 * stations as its rake demands and a flat one gets as few as its own flatness
 * allows — the aft roof line stops rising entirely past 3.0m aft, and a
 * band there needs only 2 stations for its still-tapering width, where the
 * same LENGTH over the raked windscreen shoulder needs 10. A per-band mesh
 * count, chosen from the geometry, is what keeps this fix inside
 * Cockpit.test.ts's mesh budget: a flat 0.05m step everywhere (tried first)
 * measured RIGHT under railEdge.test.ts's tolerance but pushed the cockpit's
 * own mesh count from 600 to 748, well past its 700 cap — most of the added
 * mesh count was spent re-proving what a flat band already had no float in.
 */
function railStationCount(za: number, zb: number): number {
  const swingX = Math.abs(apertureHalfWidthAt(zb) - apertureHalfWidthAt(za))
  const swingY = Math.abs(roofYAt(zb) - roofYAt(za))
  return Math.max(1, Math.ceil(Math.max(swingX, swingY) / (2 * RAIL_LOFT_MARGIN)))
}

/**
 * A rail standing proud of the reveal, so the window edge reads as a machined
 * frame member rather than as a cut line — LOFTED along that edge rather than
 * built as one box at the band's midpoint. A single box tracked the true
 * window edge only at its own centre, so on a raked band its two ends floated
 * off the glass — two boxes read as "protruding into the transparencies".
 * Splitting the band into railStationCount stretches and giving each its own
 * small box, from the SAME two curves (apertureHalfWidthAt, roofYAt) every
 * other member in this file already reads, keeps every stretch's own float
 * inside tolerance without changing the rail's cross-section or its
 * standing-proud read. A flat or short band collapses to one or two
 * stretches and comes out visually the same as before; every band goes
 * through the same function, so none can float again.
 */
function railLoft(group: Group, sign: Sign, za: number, zb: number): void {
  const segments = railStationCount(za, zb)
  for (let i = 0; i < segments; i++) {
    const sa = za + ((zb - za) * i) / segments
    const sb = za + ((zb - za) * (i + 1)) / segments
    const edgeA = apertureHalfWidthAt(sa)
    const edgeB = apertureHalfWidthAt(sb)
    group.add(
      box(RAIL_THICKNESS, RAIL_DEPTH, sb - sa, gunmetalMaterial(), {
        x: (sign * (edgeA + edgeB)) / 2,
        y: (roofYAt(sa) + roofYAt(sb)) / 2 - RAIL_DEPTH / 2,
        z: (sa + sb) / 2,
      })
    )
  }
}

/**
 * The inner pane, sitting in the reveal just above the liner. The canopy's own
 * glazing is a 0.6-opacity tint on the OUTSIDE of the deck; this is the
 * cabin-side layer, and the pair of them is what gives the brightness step a
 * critic could not find from inside.
 */
export function innerPane(
  group: Group,
  band: Band,
  material: ReturnType<typeof innerGlazingMaterial>
): void {
  const { za, zb } = band
  const a = apertureHalfWidthAt(za)
  const b = apertureHalfWidthAt(zb)
  if (a <= 0 || b <= 0) return
  const yA = roofYAt(za) + 0.02
  const yB = roofYAt(zb) + 0.02
  group.add(flatQuad(at(-a, yA, za), at(a, yA, za), at(b, yB, zb), at(-b, yB, zb), material))
}
