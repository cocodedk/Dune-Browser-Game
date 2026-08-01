// vehicle-shop/ornihopter/src/model/wingRootAttachment.test.ts
// Bar item 3: "no wing's root vertex may leave the hull" — measured, not
// eyeballed. Drives the REAL WingRig (the actual Fold -> Flap -> Feather ->
// Blade Object3D hierarchy, not a re-derivation of its maths) across two
// full beat cycles for all eight wings, and checks the root cross-section's
// world position against the fixed attachment point on the hull.
//
// The previous version of this craft had wing roots swinging 8 units out of
// a hull of radius 2.6 (see progress.md). The centroid of the four root-ring
// vertices sits exactly on the Fold/Flap/Feather rotation axes by
// construction (geometry/wingGeometry.ts roots every station-0 vertex at
// local x=0, and those four vertices are symmetric about that axis), so its
// world position should be pinned to the attachment point to floating-point
// precision for every phase; the individual ring vertices (offset from the
// axis by half the root thickness/chord) are allowed a small, bounded
// excursion, measured and asserted below rather than assumed.

import { describe, it, expect } from 'vitest'
import { Vector3, MeshBasicMaterial, type Object3D } from 'three'
import { createWingRig } from './WingRig'
import { buildWingBladeGeometry } from './geometry/wingGeometry'
import { WING, WING_ROOTS, WING_ROOT_X } from '../spec'
import type { WingSide } from './wingKinematics'

const SIDES: readonly WingSide[] = ['left', 'right']
const PHASE_SAMPLES = 24
const material = new MeshBasicMaterial()
const blades: Record<WingSide, ReturnType<typeof buildWingBladeGeometry>> = {
  left: buildWingBladeGeometry('left', WING.reach),
  right: buildWingBladeGeometry('right', WING.reach),
}

/** The four station-0 (root) vertices, in the blade's own local space. */
function rootRingLocal(side: WingSide): Vector3[] {
  const position = blades[side].attributes.position
  return [0, 1, 2, 3].map((i) => new Vector3(position.getX(i), position.getY(i), position.getZ(i)))
}

// Reported to the user verbatim — see the module's final report.
let measuredMaxCentroidExcursion = 0
let measuredMaxVertexExcursion = 0

describe('wing root stays attached to the hull across the beat cycle (bar item 3)', () => {
  for (let pairIndex = 0; pairIndex < WING_ROOTS.length; pairIndex++) {
    for (const side of SIDES) {
      it(`pair ${pairIndex} ${side}`, () => {
        const mount = WING_ROOTS[pairIndex]
        const attachment = { x: side === 'right' ? WING_ROOT_X : -WING_ROOT_X, y: mount.y, z: mount.z }
        const target = new Vector3(attachment.x, attachment.y, attachment.z)
        const localRing = rootRingLocal(side)
        const rig = createWingRig(side, pairIndex, attachment, blades[side], material)

        for (let i = 0; i <= PHASE_SAMPLES; i++) {
          const phase = (i / PHASE_SAMPLES) * Math.PI * 4 // two full beat cycles
          rig.update(phase)
          rig.root.updateMatrixWorld(true)
          const bladeObject = rig.root.getObjectByName('wing-blade') as Object3D | null
          if (!bladeObject) throw new Error('wing-blade not found in rig hierarchy')

          const centroid = new Vector3()
          for (const v of localRing) centroid.add(v)
          centroid.multiplyScalar(1 / localRing.length).applyMatrix4(bladeObject.matrixWorld)
          const centroidExcursion = centroid.distanceTo(target)
          measuredMaxCentroidExcursion = Math.max(measuredMaxCentroidExcursion, centroidExcursion)
          expect(centroidExcursion).toBeLessThan(1e-6)

          for (const v of localRing) {
            const world = v.clone().applyMatrix4(bladeObject.matrixWorld)
            measuredMaxVertexExcursion = Math.max(measuredMaxVertexExcursion, world.distanceTo(target))
          }
        }
      })
    }
  }

  it('reports the measured excursion (contrast: the previous rig swung 8 units out of a radius-2.6 hull)', () => {
    console.log(
      `[wing-root-excursion] centroid=${measuredMaxCentroidExcursion.toExponential(3)} `
      + `vertex=${measuredMaxVertexExcursion.toFixed(4)}`,
    )
    expect(measuredMaxVertexExcursion).toBeLessThan(1)
  })
})
