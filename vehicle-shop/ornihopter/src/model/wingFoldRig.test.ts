// vehicle-shop/ornihopter/src/model/wingFoldRig.test.ts
// (f) What the fold does to the BEAT. Two halves, and the second one is the
// one that protects the other twelve wing suites:
//   folded   — the flap/feather stroke contributes exactly nothing, at every
//              beat phase and every drive amplitude. A folded wing does not
//              feather; it holds the stowed pose whatever the phase clock is
//              doing.
//   unfolded — bit-for-bit the rotations the rig produced before this round
//              existed, across a whole beat sweep. The comparison is against
//              wingKinematics.ts's own expressions, which ARE the pre-round
//              right-hand sides, evaluated in the same order.

import { describe, it, expect } from 'vitest'
import { MeshBasicMaterial, type Group } from 'three'
import { createWingRig } from './WingRig'
import { buildWingBladeGeometry } from './geometry/wingGeometry'
import { pivotForMount } from './geometry/wing/rootPod'
import { foldAngle, flapAngle, featherAngle, type WingSide } from './wingKinematics'
import { foldTiltAt, foldYawAt } from './wingFoldPose'
import { WING, WING_ROOTS } from '../spec'

const SIDES: readonly WingSide[] = ['left', 'right']
const material = new MeshBasicMaterial()
const blades = {
  left: buildWingBladeGeometry('left', WING.reach),
  right: buildWingBladeGeometry('right', WING.reach),
}

function rigFor(side: WingSide, pairIndex: number) {
  const pivot = pivotForMount(WING_ROOTS[pairIndex])
  const attachment = { x: (side === 'right' ? 1 : -1) * pivot.x, y: pivot.y, z: WING_ROOTS[pairIndex].z }
  const rig = createWingRig(side, pairIndex, attachment, blades[side], material)
  const flap = rig.root.getObjectByName('wing-flap') as Group
  const feather = rig.root.getObjectByName('wing-feather') as Group
  return { rig, flap, feather }
}

describe('the fold bypasses the beat rig cleanly', () => {
  for (const side of SIDES) {
    for (let pairIndex = 0; pairIndex < WING_ROOTS.length; pairIndex++) {
      const mirror = side === 'right' ? 1 : -1

      it(`${side} pair ${pairIndex}: folded, the stroke contributes zero`, () => {
        const { rig, flap, feather } = rigFor(side, pairIndex)
        for (const fold of [0.25, 0.5, 0.75, 1]) {
          for (const amplitude of [0, 0.5, 1]) {
            const poses = [0, 1.1, Math.PI, 4.7].map((phase) => {
              rig.update(phase, amplitude, fold)
              return [rig.root.rotation.y, flap.rotation.z, feather.rotation.x]
            })
            for (const pose of poses) {
              expect(pose[0]).toBe(mirror * foldYawAt(pairIndex, fold))
              expect(pose[1]).toBe(mirror * foldTiltAt(pairIndex, fold))
              expect(pose[2]).toBe(0)
              // Same pose whatever the phase and amplitude were.
              expect(pose).toEqual(poses[0])
            }
          }
        }
      })

      it(`${side} pair ${pairIndex}: unfolded, bit-identical to the beat rig`, () => {
        const { rig, flap, feather } = rigFor(side, pairIndex)
        for (let i = 0; i <= 64; i++) {
          const phase = (i / 64) * Math.PI * 4
          for (const amplitude of [0, 0.37, 1]) {
            rig.update(phase, amplitude, 0)
            expect(Object.is(rig.root.rotation.y, mirror * foldAngle(pairIndex))).toBe(true)
            expect(Object.is(flap.rotation.z, mirror * flapAngle(phase, pairIndex) * amplitude)).toBe(true)
            expect(Object.is(feather.rotation.x, featherAngle(phase, pairIndex) * amplitude)).toBe(true)
          }
        }
      })

      it(`${side} pair ${pairIndex}: a fold that returns to 0 restores the stance`, () => {
        const { rig, flap, feather } = rigFor(side, pairIndex)
        rig.update(2.2, 1, 0)
        const before = [rig.root.rotation.y, flap.rotation.z, feather.rotation.x]
        rig.update(2.2, 0, 1)
        rig.update(2.2, 1, 0)
        expect([rig.root.rotation.y, flap.rotation.z, feather.rotation.x]).toEqual(before)
      })
    }
  }
})
