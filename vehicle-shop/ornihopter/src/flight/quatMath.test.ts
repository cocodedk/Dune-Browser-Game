// vehicle-shop/ornihopter/src/flight/quatMath.test.ts
// Verifies the two facts rotation.ts is built on, independent of
// rotation.ts's own code: (1) quatFromAxisAngle matches contracts.ts's
// rotate() at clean 90-degree cases with hand-derivable answers, and
// (2) quatMultiply(orientation, delta) composes delta as a LOCAL/body-frame
// rotation, not a world-frame one. Getting (2) backwards is exactly the
// class of bug the nose/tail mixup was: locally plausible, silently wrong.
// Proof of (2): a local-axis post-multiply must equal pre-multiplying by
// the SAME rotation expressed as a world-space axis, using whatever
// direction that local axis currently points (starboardDirection). If
// quatMultiply's argument order were flipped, these two would disagree.

import { describe, it, expect } from 'vitest'
import { noseDirection, starboardDirection, upDirection } from '../contracts'
import { quatMultiply, quatFromAxisAngle, quatNormalise, IDENTITY_QUAT } from './quatMath'

const HALF_PI = Math.PI / 2

describe('quatFromAxisAngle matches contracts.ts direction helpers', () => {
  it('90 degrees about +Y turns the nose from forward to port (-X)', () => {
    const q = quatFromAxisAngle({ x: 0, y: 1, z: 0 }, HALF_PI)
    const nose = noseDirection(q)
    expect(nose.x).toBeCloseTo(-1, 6)
    expect(nose.y).toBeCloseTo(0, 6)
    expect(nose.z).toBeCloseTo(0, 6)
  })

  it('90 degrees about +X pitches the nose to point straight up', () => {
    const q = quatFromAxisAngle({ x: 1, y: 0, z: 0 }, HALF_PI)
    const nose = noseDirection(q)
    expect(nose.x).toBeCloseTo(0, 6)
    expect(nose.y).toBeCloseTo(1, 6)
    expect(nose.z).toBeCloseTo(0, 6)
  })

  it('90 degrees about +Z rolls the starboard wing to point straight up', () => {
    const q = quatFromAxisAngle({ x: 0, y: 0, z: 1 }, HALF_PI)
    const starboard = starboardDirection(q)
    expect(starboard.x).toBeCloseTo(0, 6)
    expect(starboard.y).toBeCloseTo(1, 6)
    expect(starboard.z).toBeCloseTo(0, 6)
  })
})

describe('quatMultiply composes deltas in the LOCAL frame', () => {
  it('post-multiplying a local-axis delta equals pre-multiplying the same delta expressed as the current world-space axis', () => {
    const yawed = quatNormalise(quatMultiply(IDENTITY_QUAT, quatFromAxisAngle({ x: 0, y: 1, z: 0 }, HALF_PI)))

    // Method A: what rotation.ts does -- post-multiply by a LOCAL (1,0,0) delta.
    const local = quatFromAxisAngle({ x: 1, y: 0, z: 0 }, HALF_PI)
    const viaLocalPostMultiply = quatNormalise(quatMultiply(yawed, local))

    // Method B: pre-multiply by the SAME rotation, expressed as whatever
    // world-space direction local +X currently points (its starboard axis).
    const worldAxis = starboardDirection(yawed)
    const world = quatFromAxisAngle(worldAxis, HALF_PI)
    const viaWorldPreMultiply = quatNormalise(quatMultiply(world, yawed))

    const a = noseDirection(viaLocalPostMultiply)
    const b = noseDirection(viaWorldPreMultiply)
    expect(a.x).toBeCloseTo(b.x, 6)
    expect(a.y).toBeCloseTo(b.y, 6)
    expect(a.z).toBeCloseTo(b.z, 6)
    // Concretely: yaw left 90, then pitch up 90 about the NEW local X axis,
    // ends nose-up (straight into the sky), not nose-forward-again.
    expect(a.y).toBeCloseTo(1, 6)
  })
})

describe('quatNormalise', () => {
  it('renormalises a scaled-up quaternion back to unit length', () => {
    const scaled = { x: 0, y: 0, z: 0, w: 5 }
    const result = quatNormalise(scaled)
    expect(Math.hypot(result.x, result.y, result.z, result.w)).toBeCloseTo(1, 10)
  })

  it('falls back to identity for a degenerate zero-magnitude quaternion', () => {
    const result = quatNormalise({ x: 0, y: 0, z: 0, w: 0 })
    expect(result).toEqual(IDENTITY_QUAT)
    expect(upDirection(result).y).toBeCloseTo(1, 10)
  })
})
