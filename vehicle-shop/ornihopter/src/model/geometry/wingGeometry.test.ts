// vehicle-shop/ornihopter/src/model/geometry/wingGeometry.test.ts
// The blade geometry itself: mirrored span direction per side, root at the
// origin (load-bearing for WingRig.ts's hinge invariant — see
// wingRootAttachment.test.ts), tip reaching exactly `reach`, and a sane
// triangle budget.

import { describe, it, expect } from 'vitest'
import { buildWingBladeGeometry } from './wingGeometry'
import { WING } from '../../spec'

describe('buildWingBladeGeometry', () => {
  it('roots every station-0 vertex at local x = 0, for both sides', () => {
    for (const side of ['left', 'right'] as const) {
      const geometry = buildWingBladeGeometry(side, WING.reach)
      const position = geometry.attributes.position
      for (let i = 0; i < 4; i++) expect(position.getX(i)).toBeCloseTo(0, 10)
    }
  })

  it('mirrors the tip toward +X for the right wing and -X for the left', () => {
    const right = buildWingBladeGeometry('right', WING.reach)
    const left = buildWingBladeGeometry('left', WING.reach)
    const rightPosition = right.attributes.position
    const leftPosition = left.attributes.position
    const lastRight = rightPosition.count - 4
    const lastLeft = leftPosition.count - 4
    // Float32Array (BufferAttribute's backing store) only carries ~7
    // significant digits, so this compares to 4 decimal places, not 6.
    expect(rightPosition.getX(lastRight)).toBeCloseTo(WING.reach, 4)
    expect(leftPosition.getX(lastLeft)).toBeCloseTo(-WING.reach, 4)
  })

  it('produces a sane, cheap triangle budget (flyable-first: simple forms)', () => {
    const geometry = buildWingBladeGeometry('right', WING.reach)
    const triangleCount = (geometry.index?.count ?? 0) / 3
    expect(triangleCount).toBeGreaterThan(50)
    expect(triangleCount).toBeLessThan(1000)
  })

  it('every vertex stays within +-half the max measured chord of the span centreline', () => {
    const geometry = buildWingBladeGeometry('right', WING.reach)
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      expect(Math.abs(position.getZ(i))).toBeLessThanOrEqual(WING.reach / WING.lengthOverMaxChord / 2 + 1e-6)
    }
  })
})
