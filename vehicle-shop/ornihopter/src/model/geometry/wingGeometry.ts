// vehicle-shop/ornihopter/src/model/geometry/wingGeometry.ts
// One wing blade: a solid ribbon with real volume, from the ball-joint pivot
// out to the tip. Chord width comes from chordProfile.ts (spec.ts's measured
// planform); the blade's own centreline BOWS per geometry/wing/sweepProfile.ts
// (spec.ts's WING.sweepProfile, likewise measured off the kit's wing plate) —
// until this round that array went unconsumed, which is exactly why the
// wings were dead straight. Cross-section character blends from a rounder,
// near-uniform ARM (spanFraction < WING.rootArmFraction, a real physical rod
// between the ball and the blade, not merely a narrow chord) into a
// wedge-profiled BLADE with a thicker leading-edge spar, a thin trailing
// edge and slight camber — see buildCrossSection for why this still fits in
// 4 points/station.
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
import { sweepOffsetAt, rootBlendAt } from './wing/sweepProfile'
import type { WingSide } from '../wingKinematics'

const SPAN_STATIONS = 40 // smooth resampling of the 20 measured control points

// Cross-section character: the arm (near the ball) reads as a rounder,
// near-uniform rod; the blade proper as a thin membrane with a fat
// leading-edge spar and a knife trailing edge. Both blend across
// WING.rootArmFraction, which is what turns chordProfile's existing width
// dip into a real KINK in physical FORM too, not just a narrower bit of the
// same flat ribbon (spec.ts WING.rootArmFraction's own comment: "a real
// physical arm... not merely a narrow chord").
const ARM_ROUND_SCALE = 1.5
const BLADE_LEADING_SCALE = 1.3
const BLADE_TRAILING_SCALE = 0.45
const CAMBER_LIFT = 0.28

function outboardSign(side: WingSide): 1 | -1 {
  return side === 'right' ? 1 : -1
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

interface CrossSection {
  readonly topFront: number
  readonly bottomFront: number
  readonly topBack: number
  readonly bottomBack: number
  readonly centreline: number
}

/**
 * The four Y offsets (top/bottom x leading/trailing) and the Z centreline
 * for one span station. Deliberately still 4 points, not a richer polygon:
 * wingRootAttachment.test.ts reads the first 4 emitted vertices as one rigid
 * ring and requires their LOCAL centroid to be exactly (0,0,0). Leading vs
 * trailing thickness asymmetry (the spar wedge) always nets to zero in that
 * average — front and back cancel top-for-bottom regardless of their
 * magnitudes — but the centreline and camber terms only net to zero once
 * blended to zero at the root, which is exactly what sweepProfile.ts's
 * rootBlendAt already does; reusing it here zeroes both at the identical
 * station.
 */
function buildCrossSection(spanFraction: number): CrossSection {
  const halfThickness = WING.thickness / 2
  const armEase = smoothstep(spanFraction / WING.rootArmFraction)
  const leadingHalf = halfThickness * lerp(ARM_ROUND_SCALE, BLADE_LEADING_SCALE, armEase)
  const trailingHalf = halfThickness * lerp(ARM_ROUND_SCALE, BLADE_TRAILING_SCALE, armEase)
  const camberFront = rootBlendAt(spanFraction) * CAMBER_LIFT * halfThickness

  return {
    topFront: camberFront + leadingHalf,
    bottomFront: camberFront - leadingHalf,
    topBack: trailingHalf,
    bottomBack: -trailingHalf,
    centreline: sweepOffsetAt(spanFraction),
  }
}

/**
 * Lofted cross-section (top, bottom, leading-edge and trailing-edge
 * surfaces, plus root and tip caps) so the blade reads as a real thin solid
 * with volume, a leading-edge spar and slight camber, rather than a flat
 * unlit plane — using buildCrossSection for the Y/Z shape at each of
 * SPAN_STATIONS resampled positions along the span.
 */
export function buildWingBladeGeometry(side: WingSide, reach: number): BufferGeometry {
  const sign = outboardSign(side)
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i < SPAN_STATIONS; i++) {
    const spanFraction = i / (SPAN_STATIONS - 1)
    const x = sign * spanFraction * reach
    const halfChord = chordWidthAt(spanFraction) / 2
    const cross = buildCrossSection(spanFraction)
    const front = cross.centreline - halfChord
    const back = cross.centreline + halfChord
    positions.push(
      x, cross.topFront, front,
      x, cross.topBack, back,
      x, cross.bottomFront, front,
      x, cross.bottomBack, back,
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

  // Mirroring by negating X inverts every triangle's handedness, so the same
  // index list that winds counter-clockwise on the right wing winds clockwise
  // on the left. computeVertexNormals() then points the mirrored side's
  // normals INWARD and that wing renders black under the same light that lits
  // its twin — which is exactly what a blind critic saw in the top view:
  // "left blades render lit tan and the right blades render pitch black".
  // Swapping two indices per triangle restores the winding.
  //
  // Worth noting how this survived: the wing tests measured vertex POSITIONS,
  // which were correct, and nothing measured winding at all. The test below
  // this file's fix asserts the normals themselves.
  // Measured, not reasoned: with no swap at all, the RIGHT wing's upper-surface
  // normals average -0.995 in Y (pointing at the ground) while the left wing's
  // are correct. The index list above is therefore authored for the negative-X
  // orientation, and it is the positive-X side that needs re-winding. My first
  // attempt swapped `sign < 0` on the strength of reading the code, and the
  // normals test caught it immediately — the blind critic had said the right
  // blades were the black ones and the critic was right.
  if (sign > 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1]
      indices[i + 1] = indices[i + 2]
      indices[i + 2] = swap
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(new Uint16BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  return geometry
}
