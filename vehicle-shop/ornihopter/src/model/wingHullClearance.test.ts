// vehicle-shop/ornihopter/src/model/wingHullClearance.test.ts
// Bar item 3, second half: "no blade may pass through the fuselage." Samples
// the blade's actual vertex data at many span/chord positions and many beat
// phases, transforms each through the real WingRig hierarchy, and checks it
// against the same hull envelope hullGeometry.ts uses to build the visible
// hull surface (geometry/hullProfile.ts) — so this check and the rendered
// mesh can never disagree about where the hull actually is.

import { describe, it, expect } from 'vitest'
import { Vector3, MeshBasicMaterial, type Object3D } from 'three'
import { createWingRig } from './WingRig'
import { buildWingBladeGeometry } from './geometry/wingGeometry'
import { isOutsideHull } from './geometry/hullProfile'
import { WING, WING_ROOTS } from '../spec'
import { pivotForMount } from './geometry/wing/rootPod'
import type { WingSide } from './wingKinematics'

const SIDES: readonly WingSide[] = ['left', 'right']
const PHASE_SAMPLES = 16
const VERTEX_STRIDE = 5
const material = new MeshBasicMaterial()
const blades: Record<WingSide, ReturnType<typeof buildWingBladeGeometry>> = {
  left: buildWingBladeGeometry('left', WING.reach),
  right: buildWingBladeGeometry('right', WING.reach),
}

describe('wing blade never clips the fuselage across the beat cycle (bar item 3)', () => {
  for (let pairIndex = 0; pairIndex < WING_ROOTS.length; pairIndex++) {
    for (const side of SIDES) {
      it(`pair ${pairIndex} ${side}`, () => {
        const mount = WING_ROOTS[pairIndex]
        // Round 6a: the real hull-seated pivot (geometry/wing/rootPod.ts),
        // which is what Ornithopter.ts builds. The old fixture hung the root
        // at full beam and a spec-authored height, well outboard of where the
        // blade actually starts — a strictly easier test than the craft.
        const pivot = pivotForMount(mount)
        const attachment = { x: (side === 'right' ? 1 : -1) * pivot.x, y: pivot.y, z: mount.z }
        const blade = blades[side]
        const rig = createWingRig(side, pairIndex, attachment, blade, material)
        const position = blade.attributes.position

        for (let i = 0; i <= PHASE_SAMPLES; i++) {
          const phase = (i / PHASE_SAMPLES) * Math.PI * 4
          rig.update(phase)
          rig.root.updateMatrixWorld(true)
          const bladeObject = rig.root.getObjectByName('wing-blade') as Object3D | null
          if (!bladeObject) throw new Error('wing-blade not found in rig hierarchy')

          // Every VERTEX_STRIDE-th vertex (root, tip and points between, all
          // four cross-section corners in rotation) is plenty to catch a
          // swept blade dipping into the hull without an
          // O(vertexCount * phases * wings) test getting slow.
          for (let v = 0; v < position.count; v += VERTEX_STRIDE) {
            const local = new Vector3(position.getX(v), position.getY(v), position.getZ(v))
            const world = local.applyMatrix4(bladeObject.matrixWorld)
            expect(isOutsideHull(world.x, world.y, world.z)).toBe(true)
          }
        }
      })
    }
  }
})
