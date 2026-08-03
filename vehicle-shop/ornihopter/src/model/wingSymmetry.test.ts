// vehicle-shop/ornihopter/src/model/wingSymmetry.test.ts
// Bar item Q4.4: left and right wings must be symmetric.
//
// Two blind critics, independently and without being told what they were
// looking at, reported the same thing from the top view: one side's blades
// render bright and the other's near-black. The second added "under one sun,
// mirrored wings should shade mirrored — verify this one."
//
// It is NOT the geometry normals: wingNormals.test.ts already pins those, and
// they are correct in local space. It is not obviously the missing `mirror` on
// feather either — WingRig applies `mirror` to fold and flap but not to
// feather, which looks wrong until you work it through: a rotation about the
// span axis lifts BOTH leading edges the same way regardless of which
// direction the blade extends, so feather is symmetric without it.
//
// So this measures the thing that actually decides the shading — the
// world-space orientation of corresponding blades — rather than reasoning
// about any single rotation in isolation.

import { describe, it, expect } from 'vitest'
import { Vector3, Object3D } from 'three'
import type { Mesh } from 'three'
import { createOrnithopter } from './Ornithopter'
import type { FlightState } from '../contracts'

function stateAt(beatPhase: number): FlightState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: -50 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    throttle: 0.5,
    speed: 50,
    altitude: 100,
    beatPhase,
    beatHz: 2.6,
  }
}

/**
 * Mean world-space normal of every blade mesh whose span reaches past the hull,
 * split by which side of the centreline it lies on.
 */
function meanBladeNormalsBySide(beatPhase: number): { port: Vector3; starboard: Vector3 } {
  const craft = createOrnithopter()
  craft.update(stateAt(beatPhase))
  const root = craft.root as unknown as Object3D
  root.updateMatrixWorld(true)

  const port = new Vector3()
  const starboard = new Vector3()
  let portCount = 0
  let starboardCount = 0
  const normal = new Vector3()
  const centre = new Vector3()

  root.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const position = mesh.geometry.attributes.position
    const normals = mesh.geometry.attributes.normal
    if (!position || !normals) return

    // Blades reach far outboard; hull and pods do not.
    let reach = 0
    for (let i = 0; i < position.count; i++) {
      const v = new Vector3().fromBufferAttribute(position, i)
      mesh.localToWorld(v)
      reach = Math.max(reach, Math.abs(v.x))
    }
    if (reach < 8) return

    centre.set(0, 0, 0)
    const accumulated = new Vector3()
    let used = 0
    for (let i = 0; i < normals.count; i++) {
      // Upper surface only: local +Y before any transform.
      if (position.getY(i) <= 0) continue
      normal.fromBufferAttribute(normals, i)
      normal.transformDirection(mesh.matrixWorld)
      accumulated.add(normal)
      const p = new Vector3().fromBufferAttribute(position, i)
      mesh.localToWorld(p)
      centre.add(p)
      used++
    }
    if (used === 0) return
    accumulated.divideScalar(used).normalize()
    centre.divideScalar(used)

    if (centre.x < 0) {
      port.add(accumulated)
      portCount++
    } else {
      starboard.add(accumulated)
      starboardCount++
    }
  })

  craft.dispose()
  expect(portCount).toBeGreaterThan(0)
  expect(starboardCount).toBeGreaterThan(0)
  return {
    port: port.divideScalar(portCount).normalize(),
    starboard: starboard.divideScalar(starboardCount).normalize(),
  }
}

describe('wing left/right symmetry in world space', () => {
  for (const [label, phase] of [
    ['at the capture pose', 0],
    ['at mid-upstroke', Math.PI / 2],
    ['at the opposite phase', Math.PI],
  ] as const) {
    it(`mirrors the blade normals ${label}`, () => {
      const { port, starboard } = meanBladeNormalsBySide(phase)

      // A mirrored pair must have the same vertical and longitudinal
      // components and opposite lateral ones. Any other relationship means the
      // two sides present different faces to the same sun, which is what both
      // critics saw.
      expect(port.y).toBeCloseTo(starboard.y, 2)
      expect(port.z).toBeCloseTo(starboard.z, 2)
      expect(port.x).toBeCloseTo(-starboard.x, 2)
    })
  }
})
