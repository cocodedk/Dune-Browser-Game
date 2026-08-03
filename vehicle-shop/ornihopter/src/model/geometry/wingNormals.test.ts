// vehicle-shop/ornihopter/src/model/geometry/wingNormals.test.ts
// The left and right wings must be lit the same way by the same light.
//
// They were not. A blind critic, shown the top view and told nothing, reported
// "left blades render lit tan and the right blades render pitch black... a
// symmetric craft under symmetric light should not do this." The cause was
// that buildWingBladeGeometry mirrors by negating vertex X while reusing one
// fixed index list, which inverts triangle handedness and makes
// computeVertexNormals() point the mirrored side's normals inward.
//
// Every existing wing test passed throughout, because they all measured vertex
// POSITIONS — which were correct — and none measured winding. This one
// measures the normals.

import { describe, it, expect } from 'vitest'
import { buildWingBladeGeometry } from './wingGeometry'
import { WING } from '../../spec'

/** Mean normal of the vertices on a blade's upper surface. */
function meanUpperNormal(side: 'left' | 'right'): { x: number; y: number; z: number } {
  const geometry = buildWingBladeGeometry(side, WING.reach)
  const normal = geometry.attributes.normal
  const position = geometry.attributes.position
  let x = 0
  let y = 0
  let z = 0
  let n = 0
  for (let i = 0; i < normal.count; i++) {
    // Upper-surface vertices are the ones sitting at +halfThickness.
    if (position.getY(i) <= 0) continue
    x += normal.getX(i)
    y += normal.getY(i)
    z += normal.getZ(i)
    n++
  }
  geometry.dispose()
  expect(n).toBeGreaterThan(0)
  return { x: x / n, y: y / n, z: z / n }
}

describe('wing surface normals', () => {
  it('point upward on the upper surface of the right wing', () => {
    expect(meanUpperNormal('right').y).toBeGreaterThan(0.5)
  })

  it('point upward on the upper surface of the left wing too', () => {
    // This is the assertion that failed before the winding fix: the mirrored
    // blade's upper surface pointed straight down, so it faced away from the
    // sky and rendered black.
    expect(meanUpperNormal('left').y).toBeGreaterThan(0.5)
  })

  it('are symmetric between the two sides', () => {
    const left = meanUpperNormal('left')
    const right = meanUpperNormal('right')
    // Same vertical component; X mirrored; Z the same. Anything else means the
    // two wings will not catch the same light at the same beat phase.
    expect(left.y).toBeCloseTo(right.y, 5)
    expect(left.x).toBeCloseTo(-right.x, 5)
    expect(left.z).toBeCloseTo(right.z, 5)
  })
})
