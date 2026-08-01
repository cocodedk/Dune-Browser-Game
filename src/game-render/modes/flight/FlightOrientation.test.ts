// src/game-render/modes/flight/FlightOrientation.test.ts
// Guard test for the stage 22 defect measured directly against the shipped
// build: the craft flew tail-first. `yawOf()` in FlightPath.ts orients the
// group; the fuselage (fuselageGeometry.ts's HULL_PROFILE) is built
// nose-forward along local -Z. This composes the two exactly as
// FlightMode.ts does (`group.rotation.set(0, yawOf(arc), bankAt(progress))`)
// with a bare three.js Object3D — transform maths needs no GL context, see
// Ornithopter.test.ts for the same pattern — so it exercises the real
// rotation matrix rather than a hand-derived formula that could share
// whatever mistake it is meant to catch.
//
// Measured on the shipped build before this fix: nose . travel = -1.000
// (exactly opposite), tail . travel = +1.000 (the tail led). See
// docs/PRD/dune92/stages/22-ornithopter.md's defect report. This test must
// fail against `Math.atan2(heading.x, heading.z)` (the formula this
// replaces) and pass against the fix.

import { describe, it, expect } from 'vitest'
import { Object3D, Vector3 } from 'three'
import { yawOf, headingOf, bankAt } from './FlightPath'
import type { FlightArc } from './FlightPath'

const ARC: FlightArc = {
  from: { x: -750, y: 90, z: 200 },
  to: { x: 750, y: 90, z: -200 },
  apex: 70,
}

/** Local -Z: the nose, per fuselageGeometry.ts's HULL_PROFILE (nose tip is the most negative z). */
const NOSE_LOCAL = new Vector3(0, 0, -1)
/** Local +Z: the tail. */
const TAIL_LOCAL = new Vector3(0, 0, 1)

/** The same rotation FlightMode.ts's update() applies to craft.group every frame. */
function orientedCraft(arc: FlightArc, progress: number): Object3D {
  const object = new Object3D()
  object.rotation.set(0, yawOf(arc), bankAt(progress))
  object.updateMatrixWorld(true)
  return object
}

describe('the craft flies nose-first (stage 22 defect: it flew backward)', () => {
  it('points its nose along the direction of travel, not against it', () => {
    const heading = headingOf(ARC)
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const craft = orientedCraft(ARC, progress)
      const nose = NOSE_LOCAL.clone().transformDirection(craft.matrixWorld)
      const dot = nose.x * heading.x + nose.z * heading.z
      expect(dot).toBeGreaterThan(0)
    }
  })

  it('trails its tail behind, not in front — the chase camera sits behind the craft', () => {
    const heading = headingOf(ARC)
    const craft = orientedCraft(ARC, 0.5)
    const tail = TAIL_LOCAL.clone().transformDirection(craft.matrixWorld)
    const dot = tail.x * heading.x + tail.z * heading.z
    expect(dot).toBeLessThan(0)
  })

  it('matches the measured defect exactly (heading ~(0.97, -0.26): nose dot was -1, tail dot was +1)', () => {
    const measured: FlightArc = { from: { x: 0, y: 0, z: 0 }, to: { x: 750, y: 0, z: -200 }, apex: 0 }
    const heading = headingOf(measured)
    const craft = orientedCraft(measured, 0)
    const nose = NOSE_LOCAL.clone().transformDirection(craft.matrixWorld)
    const tail = TAIL_LOCAL.clone().transformDirection(craft.matrixWorld)
    expect(nose.x * heading.x + nose.z * heading.z).toBeCloseTo(1, 6)
    expect(tail.x * heading.x + tail.z * heading.z).toBeCloseTo(-1, 6)
  })
})
