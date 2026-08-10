// character-shop/duncan/src/model/jointContinuity.test.ts
// Two convex shapes that only TOUCH at one tangent point show background
// between them the instant the view is not exactly side-on. A lead review
// found that at the elbows, wrists, knees, ankles, hips and crotch in pass
// 2, and the whole file exists to stop it coming back.
//
// Pass 4 (progress.md) changed what needs guarding rather than whether it
// does. Elbows, knees, wrists and ankles are no longer joins at all: an arm
// is one lofted surface from deltoid to wrist and a leg one from pelvis to
// ankle, so there is nothing there to come apart. What is still a join is
// where a region meets its NEIGHBOUR — arm into torso, hand into sleeve, leg
// into pelvis, boot over ankle — plus the crotch, which is now closed by
// both thigh masses crossing the midline instead of by a bridging blob.
// Every check is 3-axis: the crotch finding was two shapes that agreed in Y
// while sitting side by side with a gap in X.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { Box3 } from 'three'
import { createDuncan } from './Duncan'
import { bounds, part } from './testSupport'

// 5mm: comfortably above float noise, comfortably below the 25-50mm burial
// the tables actually build, so this fails loudly on a real regression
// rather than a rounding wobble.
const MIN_OVERLAP = 0.005

function at(root: Object3D, ...path: string[]): Object3D {
  return path.reduce((node, name) => part(node, name), root)
}

/** The smallest of the three axis overlaps, so one assertion catches
 *  whichever axis fails. */
function overlap3D(a: Object3D, b: Object3D): number {
  const boxA: Box3 = new Box3().setFromObject(a)
  const boxB: Box3 = new Box3().setFromObject(b)
  const x = Math.min(boxA.max.x, boxB.max.x) - Math.max(boxA.min.x, boxB.min.x)
  const y = Math.min(boxA.max.y, boxB.max.y) - Math.max(boxA.min.y, boxB.min.y)
  const z = Math.min(boxA.max.z, boxB.max.z) - Math.max(boxA.min.z, boxB.min.z)
  return Math.min(x, y, z)
}

describe('joint continuity: each region overlaps its neighbour in every axis', () => {
  it.each(['armL', 'armR'] as const)('%s: the deltoid is buried in the torso', (arm) => {
    const figure = createDuncan()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    expect(overlap3D(at(root, arm, 'armMass'), at(root, 'torsoMass'))).toBeGreaterThan(MIN_OVERLAP)
    figure.dispose()
  })

  it.each(['armL', 'armR'] as const)('%s: the hand is buried in the sleeve', (arm) => {
    const figure = createDuncan()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    expect(overlap3D(at(root, arm, 'hand'), at(root, arm, 'armMass'))).toBeGreaterThan(MIN_OVERLAP)
    figure.dispose()
  })

  it.each(['legL', 'legR'] as const)('%s: leg meets pelvis, and boot meets ankle', (leg) => {
    const figure = createDuncan()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    expect(overlap3D(at(root, leg, 'legMass'), at(root, 'torsoMass'))).toBeGreaterThan(MIN_OVERLAP)
    expect(overlap3D(at(root, leg, 'bootShaft'), at(root, leg, 'legMass'))).toBeGreaterThan(MIN_OVERLAP)
    figure.dispose()
  })
})

describe('joint continuity: the crotch is closed by solid, not bridged', () => {
  it.each(['legL', 'legR'] as const)('%s: the thigh mass crosses the midline', (leg) => {
    const figure = createDuncan()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const box = bounds(at(root, leg, 'legMass'))
    // Whichever side this leg is on, it must reach past x=0 into the other
    // half — that overlap between the two thighs, under the pelvis loft's
    // own rounded seat, is what fills the wedge that used to be background.
    expect(Math.min(box.max.x, -box.min.x)).toBeGreaterThan(MIN_OVERLAP)
    figure.dispose()
  })
})
