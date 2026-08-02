// vehicle-shop/ornihopter/src/model/geometry/wingGeometry.ts
// One wing blade, lofted from the ball-joint pivot out to the tip.
//
// Three modules own the shape between them, deliberately:
//   wing/rootArm.ts  the measured widths — the fine arm table and the ridged
//                    sleeve inboard, spec.ts's WING.chordProfile outboard
//   wing/sweepProfile.ts  the measured chordwise bow of the centreline
//   wing/section.ts  what the section IS at each station: a round rod near the
//                    hinge, an aerofoil with a raised leading rail and a
//                    recessed centre channel out on the blade
// This file only sweeps them into triangles.
//
// The part it models, per docs/profiles/kit-dossier.md section f and
// docs/dune_ornihopter_kit-2.png/-3.png: a hinge eye at the ball, a thin rod
// carrying a ridged sleeve, a flare, then the blade. Until this round the
// geometry left the ball at near-full chord as a flat strap — spec.ts has
// carried WING.rootArmFraction = 0.17 since round 3 and nothing consumed it
// except a cross-section blend, so the ARM existed as a thickness change on a
// full-width ribbon rather than as a rod.
//
// `side` mirrors which way "outboard" points (+X right, -X left) so the same
// pivot-rotation signs in WingRig.ts make both wings of a pair beat together —
// see that file's header. All four wings on one side share one geometry.

import { BufferGeometry, BufferAttribute, Uint16BufferAttribute } from 'three'
import { SPAN_STATIONS, wingWidthAt } from './wing/rootArm'
import { sectionAt, SECTION_POINTS, CYCLE_TO_SLOT } from './wing/section'
import { sweepOffsetAt, rootBlendAt } from './wing/sweepProfile'
import type { WingSide } from '../wingKinematics'

/** Span fraction of every emitted station, root (0) to tip (1). Exported so a
 *  test can read the real layout instead of assuming a stride — the wing tests
 *  that missed the inverted winding all assumed one. */
export { SPAN_STATIONS, SECTION_POINTS }

function outboardSign(side: WingSide): 1 | -1 {
  return side === 'right' ? 1 : -1
}

/** Vertex index of one cycle point at one station. */
function vertexOf(station: number, cycle: number): number {
  return station * SECTION_POINTS + CYCLE_TO_SLOT[cycle % SECTION_POINTS]
}

function pushSurface(indices: number[], stationCount: number): void {
  for (let i = 0; i < stationCount - 1; i++) {
    for (let c = 0; c < SECTION_POINTS; c++) {
      const a0 = vertexOf(i, c)
      const a1 = vertexOf(i, c + 1)
      const b0 = vertexOf(i + 1, c)
      const b1 = vertexOf(i + 1, c + 1)
      indices.push(a0, b0, b1, a0, b1, a1)
    }
  }
}

/** Root and tip caps, wound opposite ways, closing the loft into a solid. */
function pushCaps(indices: number[], stationCount: number): void {
  const tip = stationCount - 1
  for (let c = 1; c < SECTION_POINTS - 1; c++) {
    indices.push(vertexOf(0, 0), vertexOf(0, c + 1), vertexOf(0, c))
    indices.push(vertexOf(tip, 0), vertexOf(tip, c), vertexOf(tip, c + 1))
  }
}

/**
 * Lofted blade: top and bottom surfaces, leading bevel, trailing knife, the
 * channel walls, plus root and tip caps, so the blade is a real thin solid
 * with internal form rather than an unlit plane.
 */
export function buildWingBladeGeometry(side: WingSide, reach: number): BufferGeometry {
  const sign = outboardSign(side)
  const positions = new Float32Array(SPAN_STATIONS.length * SECTION_POINTS * 3)
  const indices: number[] = []

  for (let i = 0; i < SPAN_STATIONS.length; i++) {
    const spanFraction = SPAN_STATIONS[i]
    const x = sign * spanFraction * reach
    const section = sectionAt(
      spanFraction,
      wingWidthAt(spanFraction),
      sweepOffsetAt(spanFraction),
      rootBlendAt(spanFraction),
    )
    for (let c = 0; c < SECTION_POINTS; c++) {
      const at = vertexOf(i, c) * 3
      positions[at] = x
      positions[at + 1] = section[c].y
      positions[at + 2] = section[c].z
    }
  }

  pushSurface(indices, SPAN_STATIONS.length)
  pushCaps(indices, SPAN_STATIONS.length)

  // Mirroring by negating X inverts every triangle's handedness, so the same
  // index list that winds counter-clockwise on the right wing winds clockwise
  // on the left. computeVertexNormals() then points the mirrored side's
  // normals INWARD and that wing renders black under the same light that lits
  // its twin — which is exactly what a blind critic saw in the top view:
  // "left blades render lit tan and the right blades render pitch black".
  // Swapping two indices per triangle restores the winding.
  //
  // Worth noting how this survived: the wing tests measured vertex POSITIONS,
  // which were correct, and nothing measured winding at all. wingNormals.test.ts
  // asserts the normals themselves, and is the oracle for which side gets the
  // swap — the index list above is authored for one orientation and measurement,
  // not reading, decides which.
  if (sign > 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1]
      indices[i + 1] = indices[i + 2]
      indices[i + 2] = swap
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setIndex(new Uint16BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  return geometry
}
