// vehicle-shop/ornihopter/src/model/geometry/wingGeometry.ts
// One wing blade: a thin solid ribbon, span along local X (root at x=0),
// chord along local Z, thickness along local Y. Chord width comes from
// chordProfile.ts's interpolation of spec.ts's measured planform; this file
// only turns that curve into a BufferGeometry.
//
// `side` mirrors which way "outboard" points (+X for the right wing, -X for
// the left) so the same pivot-rotation signs in WingRig.ts make both wings
// of a pair beat together — see that file's header for the derivation. All
// four wings on one side share an identical span/chord/thickness (spec.ts
// gives every pair the same WING constants), so Ornithopter.ts builds this
// geometry only twice (once per side) and shares it across all four pairs.

import { BufferGeometry, BufferAttribute, Uint16BufferAttribute } from 'three'
import { WING } from '../../spec'
import { chordWidthAt } from './chordProfile'
import type { WingSide } from '../wingKinematics'

const SPAN_STATIONS = 40 // smooth resampling of the 20 measured control points

function outboardSign(side: WingSide): 1 | -1 {
  return side === 'right' ? 1 : -1
}

/**
 * Lofted rectangular cross-section (top, bottom, leading-edge and
 * trailing-edge surfaces, plus root and tip caps) so the blade reads as a
 * real thin solid rather than a zero-thickness plane, using WING.thickness
 * for the Y extent. Four vertices per span station: top-front, top-back,
 * bottom-front, bottom-back (front = leading edge, -Z).
 */
export function buildWingBladeGeometry(side: WingSide, reach: number): BufferGeometry {
  const sign = outboardSign(side)
  const halfThickness = WING.thickness / 2
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i < SPAN_STATIONS; i++) {
    const spanFraction = i / (SPAN_STATIONS - 1)
    const x = sign * spanFraction * reach
    const halfChord = chordWidthAt(spanFraction) / 2
    positions.push(
      x, halfThickness, -halfChord,
      x, halfThickness, halfChord,
      x, -halfThickness, -halfChord,
      x, -halfThickness, halfChord,
    )
  }

  for (let i = 0; i < SPAN_STATIONS - 1; i++) {
    const a = i * 4
    const b = (i + 1) * 4
    indices.push(a, b, b + 1, a, b + 1, a + 1) // top surface
    indices.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2) // bottom surface
    indices.push(a, a + 2, b + 2, a, b + 2, b) // leading edge
    indices.push(a + 1, b + 1, b + 3, a + 1, b + 3, a + 3) // trailing edge
  }

  // Root and tip caps close the two ends into a solid.
  indices.push(0, 1, 3, 0, 3, 2)
  const tip = (SPAN_STATIONS - 1) * 4
  indices.push(tip, tip + 3, tip + 1, tip, tip + 2, tip + 3)

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(new Uint16BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  return geometry
}
