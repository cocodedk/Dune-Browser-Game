// vehicle-shop/ornihopter/src/model/Ornithopter.test.ts
// Whole-craft checks: eight wings in four pairs, the rest-pose bounding box
// against spec.ts's length/span (bar item 4), a mesh/triangle census, and
// that dispose() actually releases what was allocated.
//
// Wing-root attachment and hull-clearance across the beat cycle have their
// own files (wingRootAttachment.test.ts, wingHullClearance.test.ts) since
// they sample many phases per wing and would otherwise make this file long.

import { describe, it, expect } from 'vitest'
import { Box3, Mesh, type Object3D } from 'three'
import { createOrnithopter } from './Ornithopter'
import { OVERALL } from '../spec'

function collectMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = []
  root.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child)
  })
  return meshes
}

describe('createOrnithopter', () => {
  it('builds exactly eight wing pivots (bar item 1: eight wings, four per side)', () => {
    const craft = createOrnithopter()
    const root = craft.root as unknown as Object3D
    const foldPivots = root.children.filter((child) => child.name.startsWith('wing-fold-'))
    expect(foldPivots.length).toBe(8)
    expect(foldPivots.filter((p) => p.name.startsWith('wing-fold-left-')).length).toBe(4)
    expect(foldPivots.filter((p) => p.name.startsWith('wing-fold-right-')).length).toBe(4)
    craft.dispose()
  })

  it('every wing pivot has a nested Fold -> Flap -> Feather -> Blade chain (bar item 2)', () => {
    const craft = createOrnithopter()
    const root = craft.root as unknown as Object3D
    const foldPivots = root.children.filter((child) => child.name.startsWith('wing-fold-'))
    for (const fold of foldPivots) {
      const flap = fold.getObjectByName('wing-flap')
      const feather = flap?.getObjectByName('wing-feather')
      const blade = feather?.getObjectByName('wing-blade')
      expect(flap).toBeTruthy()
      expect(feather).toBeTruthy()
      expect(blade).toBeTruthy()
    }
    craft.dispose()
  })

  it('matches spec.ts length and span at rest, within a few percent (bar item 4)', () => {
    const craft = createOrnithopter()
    const root = craft.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root)
    const length = box.max.z - box.min.z
    const span = box.max.x - box.min.x
    console.log(`[bounding-box] length=${length.toFixed(3)} span=${span.toFixed(3)}`)
    expect(length).toBeGreaterThan(OVERALL.length * 0.97)
    expect(length).toBeLessThanOrEqual(OVERALL.length * 1.001)
    expect(span).toBeGreaterThan(OVERALL.span * 0.9)
    expect(span).toBeLessThanOrEqual(OVERALL.span * 1.001)
    craft.dispose()
  })

  it('produces a sane mesh and triangle census', () => {
    const craft = createOrnithopter()
    const root = craft.root as unknown as Object3D
    const meshes = collectMeshes(root)
    let triangles = 0
    for (const mesh of meshes) {
      const geometry = mesh.geometry
      triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3
    }
    expect(meshes.length).toBeGreaterThanOrEqual(1 + 1 + 2 + 12 + 8) // hull, canopy, vanes, gear, wings
    expect(triangles).toBeGreaterThan(0)
    expect(triangles).toBeLessThan(20000) // flyable-first: simple forms, not a triangle budget blowout
    console.log(`[census] meshes=${meshes.length} triangles=${Math.round(triangles)}`)
    craft.dispose()
  })

  it('dispose() clears the root and does not throw twice', () => {
    const craft = createOrnithopter()
    const root = craft.root as unknown as Object3D
    expect(root.children.length).toBeGreaterThan(0)
    craft.dispose()
    expect(root.children.length).toBe(0)
    expect(() => craft.dispose()).not.toThrow()
  })
})
