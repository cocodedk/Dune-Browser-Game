// vehicle-shop/ornihopter/src/interior/Cockpit.test.ts
// Contract shape, dispose safety, and a mesh/triangle sanity check. Mirrors
// the counting logic in debug.ts so the numbers this test asserts are the
// same kind the bar's own measure() reports.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createCockpit } from './Cockpit'
import type { FlightState } from '../contracts'

const BASE_STATE: FlightState = {
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
  throttle: 0.5,
  speed: 0,
  altitude: 50,
  beatPhase: 0,
  beatHz: 0,
}

function countMeshes(root: Object3D): { meshes: number; triangles: number } {
  let meshes = 0
  let triangles = 0
  root.traverse((child) => {
    const mesh = child as Object3D & {
      isMesh?: boolean
      geometry?: { index?: { count: number } | null; attributes?: { position?: { count: number } } }
    }
    if (!mesh.isMesh || !mesh.geometry) return
    meshes++
    const index = mesh.geometry.index
    const position = mesh.geometry.attributes?.position
    triangles += index ? index.count / 3 : position ? position.count / 3 : 0
  })
  return { meshes, triangles }
}

describe('createCockpit contract', () => {
  it('exposes root, update and dispose', () => {
    const cockpit = createCockpit()
    expect(cockpit.root).toBeTruthy()
    expect(typeof cockpit.update).toBe('function')
    expect(typeof cockpit.dispose).toBe('function')
    cockpit.dispose()
  })

  it('update() does not throw across the throttle range', () => {
    const cockpit = createCockpit()
    for (const throttle of [0, 0.25, 0.5, 0.75, 1]) {
      expect(() => cockpit.update({ ...BASE_STATE, throttle })).not.toThrow()
    }
    cockpit.dispose()
  })

  it('dispose() does not throw', () => {
    const cockpit = createCockpit()
    expect(() => cockpit.dispose()).not.toThrow()
  })

  it('contains a named group for every part', () => {
    const cockpit = createCockpit()
    const root = cockpit.root as unknown as Object3D
    const names = [
      'seats', 'pilotFigure', 'console', 'sticks', 'cabinShell', 'overheadPanel', 'cabinLighting',
    ]
    for (const name of names) expect(root.getObjectByName(name)).toBeTruthy()
    cockpit.dispose()
  })

  it('is a modest, low-poly interior', () => {
    const cockpit = createCockpit()
    const { meshes, triangles } = countMeshes(cockpit.root as unknown as Object3D)
    expect(meshes).toBeGreaterThan(10)
    expect(meshes).toBeLessThan(200)
    expect(triangles).toBeGreaterThan(50)
    expect(triangles).toBeLessThan(20000)
    cockpit.dispose()
  })
})
