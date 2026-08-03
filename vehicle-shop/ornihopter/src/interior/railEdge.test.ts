// vehicle-shop/ornihopter/src/interior/railEdge.test.ts
// USER FINDING, Round 15 builder + final critic panel: two boxes "protruding
// into the transparencies". CAUSE: canopyRoof.ts's apertureReveal built each
// aperture band's side rail as ONE axis-aligned box centred on the band's own
// MIDPOINT (za+zb)/2. That tracks the true window edge only at the midpoint;
// on a raked band the two ends float away from the glass.
//
// MEASURED, the 1.2-2.1m-aft band (raked, 0.9m long): the box sat at fixed
// x +/-0.885 the whole way, but the window edge itself runs 0.730 -> 1.040
// over that span — 0.155m inboard of the true edge at the band's aft end.
// Its y ran 1.406-1.466 fixed, while the roof line ran 1.273 -> 1.660 —
// 0.224m below the roof at the same end. Port hit confirmed by raycast at
// x -0.88, y 1.39-1.41, z 1.60-2.03m aft: a bar hanging in the middle of the
// glazing instead of framing it.
//
// This asserts the rail sits ON the reveal edge everywhere in a band, not
// only at its own midpoint: 5 stations per band, both sides, each checked
// against the SAME curves (apertureHalfWidthAt, roofYAt) apertureReveal
// itself consumes — a re-assertion of the one source of truth, not a
// re-derivation of a second one that could quietly disagree with it.
//
// MEASUREMENT BASIS, x: checked against the rail's own CENTRELINE (its
// authored position, same as the defect report above), not its geometric
// outboard vertex. The rail straddles the edge by design (RAIL_THICKNESS is
// centred on it, same as the pre-existing code this replaces) — its outboard
// FACE is therefore always RAIL_THICKNESS/2 = 0.0325m past the centreline,
// which alone exceeds this test's 0.03m tolerance and would fail even a
// perfectly-lofted rail. The centreline is where the float actually lives,
// and is what the loft below is fixing. y has no such built-in offset: the
// original formula already set the box's TOP face, not its centre, to the
// roof value, so "top" is checked as literally the box's top face.

import { describe, it, expect } from 'vitest'
import { Group, Box3, BoxGeometry, type Mesh } from 'three'
import { bandsOver, apertureReveal, type Band } from './canopyRoof'
import { apertureStations, apertureHalfWidthAt, roofYAt } from './canopyLayout'
import { HALF_LENGTH } from '../spec'

const EDGE_TOLERANCE = 0.03
const SAMPLES_PER_BAND = 5

type Sign = 1 | -1

interface RailSegment {
  sign: Sign
  centerX: number
  box3: Box3
}

/** Every rail segment apertureReveal builds for one band, tagged by side.
 *  Filters on BoxGeometry specifically: the reveal's own face is a flatQuad,
 *  which never carries BoxGeometry's `.type`, so this cannot pick that up by
 *  accident and silently check the wrong mesh. */
function railSegments(band: Band): RailSegment[] {
  const group = new Group()
  apertureReveal(group, band)
  const out: RailSegment[] = []
  group.traverse((child) => {
    const mesh = child as Mesh & { isMesh?: boolean }
    if (!mesh.isMesh || !(mesh.geometry instanceof BoxGeometry)) return
    const sign = Math.sign(mesh.position.x) as Sign
    out.push({ sign, centerX: mesh.position.x, box3: new Box3().setFromObject(mesh) })
  })
  return out
}

function stationsOver(za: number, zb: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => za + ((zb - za) * i) / (count - 1))
}

/** The segment on `sign`'s side whose z-span actually contains z, epsilon
 *  padded so a station landing exactly on a shared boundary between two
 *  segments still finds one of them. */
function covering(segments: RailSegment[], sign: Sign, z: number): RailSegment | undefined {
  const EPS = 1e-6
  return segments.find(
    (s) => s.sign === sign && z >= s.box3.min.z - EPS && z <= s.box3.max.z + EPS
  )
}

function aft(z: number): string {
  return (z + HALF_LENGTH).toFixed(2)
}

/** Every station on every side where the rail does not sit within tolerance
 *  of the true edge — empty when the band is fixed. */
function violations(band: Band): string[] {
  const segments = railSegments(band)
  const out: string[] = []
  for (const sign of [1, -1] as Sign[]) {
    for (const z of stationsOver(band.za, band.zb, SAMPLES_PER_BAND)) {
      const seg = covering(segments, sign, z)
      const trueX = sign * apertureHalfWidthAt(z)
      const trueY = roofYAt(z)
      if (!seg) {
        out.push(`sign ${sign} z=${aft(z)}m aft: no rail segment covers this station`)
        continue
      }
      const topY = seg.box3.max.y
      const dx = Math.abs(seg.centerX - trueX)
      const dy = Math.abs(topY - trueY)
      if (dx > EDGE_TOLERANCE || dy > EDGE_TOLERANCE) {
        out.push(
          `sign ${sign} z=${aft(z)}m aft: rail x ${seg.centerX.toFixed(3)} vs edge ${trueX.toFixed(3)} ` +
            `(dx=${dx.toFixed(3)}); rail top ${topY.toFixed(3)} vs roof ${trueY.toFixed(3)} (dy=${dy.toFixed(3)})`
        )
      }
    }
  }
  return out
}

describe('the aperture side rail sits on the window edge along its whole run', () => {
  for (const band of bandsOver(apertureStations())) {
    it(`band ${aft(band.za)}-${aft(band.zb)}m aft: within ${EDGE_TOLERANCE}m of the true edge at ${SAMPLES_PER_BAND} stations, both sides`, () => {
      expect(violations(band).join('\n')).toBe('')
    })
  }
})
