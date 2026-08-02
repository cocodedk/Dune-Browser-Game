// vehicle-shop/harvester/src/seam.test.ts
// The seam between the crawler math and the geometry — lead-owned, sitting
// deliberately outside both, because the defect it guards lives BETWEEN them.
//
// The ornithopter shop's history is the reason this file exists: its craft
// flew tail-first for months because the hull's forward axis and the motion
// maths disagreed, and the unit tests could not see it. The harvester gets
// the guard on day one, chained through three independent sources:
//   1. GEOMETRY  the frontmost part of the real mesh is the cutter
//   2. SPEC      the cutter's tip is at BOOM.tipZ (negative local Z)
//   3. CRAWLER   the machine travels toward -Z when throttled forward

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { createHarvester } from './model/Harvester'
import { nextCrawler, rideAt } from './crawler/kinematics'
import { bearingDeg } from './contracts'
import { BOOM, OVERALL } from './spec'

function minLocalZ(root: Object3D): number {
  root.updateMatrixWorld(true)
  const v = new Vector3()
  let min = Infinity
  root.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const position = mesh.geometry.attributes.position
    if (!position) return
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i)
      mesh.localToWorld(v)
      root.worldToLocal(v)
      if (v.z < min) min = v.z
    }
  })
  return min
}

describe('seam: the machine travels toward the end its cutter points at', () => {
  it('the frontmost geometry is the cutter, at negative local Z near BOOM.tipZ', () => {
    const machine = createHarvester()
    const root = machine.root as unknown as Object3D
    const front = minLocalZ(root)
    // The cutter teeth reach a little past the tip line; tolerance covers
    // the tooth boxes without swallowing a tail-first hull.
    expect(front).toBeLessThan(-30)
    expect(front).toBeGreaterThan(BOOM.tipZ - 3)
    machine.dispose()
  })

  it('the machine is about 48m long, measured off the real geometry', () => {
    const machine = createHarvester()
    const root = machine.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    expect(size.z).toBeGreaterThan(OVERALL.length - 2)
    expect(size.z).toBeLessThan(OVERALL.length + 2)
    expect(size.x).toBeGreaterThan(OVERALL.width - 2)
    machine.dispose()
  })

  it('full throttle for six seconds moves the real machine toward its own nose', () => {
    const start = { position: { x: 0, y: 0, z: 0 }, yaw: 0, speed: 0 }
    let s = nextCrawler(start, { throttle: 1, steer: 0 }, 0)
    for (let t = 0.1; t <= 6; t += 0.1) s = nextCrawler(s, { throttle: 1, steer: 0 }, 0.1)
    // Forward is -Z: the nose direction. A tail-first machine reads +Z here.
    expect(s.position.z).toBeLessThan(-20)
    // And the ride height came along: the machine stayed on the terrain.
    const ride = rideAt(s.position.x, s.position.z, s.yaw)
    expect(s.position.y).toBeCloseTo(ride.y, 6)
  })
})

describe('heading convention', () => {
  it('bearing is 0 facing -Z and 90 after a quarter-turn to port', () => {
    expect(bearingDeg({ yaw: 0 } as never)).toBe(0)
    expect(bearingDeg({ yaw: Math.PI / 2 } as never)).toBe(90)
    expect(bearingDeg({ yaw: -Math.PI / 2 } as never)).toBe(-90)
  })
})
