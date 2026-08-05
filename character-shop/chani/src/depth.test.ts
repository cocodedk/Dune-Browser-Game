// character-shop/chani/src/depth.test.ts
// R1 pass 3's measured anchors. The pass-2 critique was structural — "the
// profile views collapse into a flat cutout" — and nothing in the existing
// suite could have caught it: every test measured X and Y. These measure Z.
//
// silhouette.test.ts (widths, symmetry, Y budget) and seam.test.ts (height,
// facing, eye line) are untouched by this file.

import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { createChani } from './model/Chani'
import { deriveProportions } from './model/proportions'

interface Extent {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  count: number
}

/** World-space X/Z extent of one named mesh's vertices inside a world Y
 *  band — the cross-section the camera sees at that height. */
function extentInYBand(root: Object3D, meshName: string, yMin: number, yMax: number): Extent {
  const obj = root.getObjectByName(meshName) as unknown as Mesh
  if (!obj) throw new Error(`${meshName} missing from the armature`)
  obj.updateMatrixWorld(true)
  const position = obj.geometry.attributes.position
  const v = new Vector3()
  const e: Extent = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, count: 0 }
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    obj.localToWorld(v)
    if (v.y < yMin || v.y > yMax) continue
    e.count++
    e.minX = Math.min(e.minX, v.x)
    e.maxX = Math.max(e.maxX, v.x)
    e.minZ = Math.min(e.minZ, v.z)
    e.maxZ = Math.max(e.maxZ, v.z)
  }
  if (!e.count) throw new Error(`${meshName} has no geometry in world Y [${yMin}, ${yMax}]`)
  return e
}

/** Divergence-theorem volume. Positive means the winding faces outward; a
 *  mesh built inside-out comes out negative, which is the "no inverted
 *  normals" correctness sweep as a number. Pass 2 shipped every tube wound
 *  inside-out (primitives.ts) and no test could see it, because inverted
 *  normals change the shading and never the silhouette. The lofts are
 *  closed solids so this is their exact volume; the tubes are open at both
 *  ends, where the term is the true volume minus two small end cones — far
 *  too small here to reach zero, so the SIGN still holds. */
function signedVolume(root: Object3D, meshName: string): number {
  const obj = root.getObjectByName(meshName) as unknown as Mesh
  if (!obj) throw new Error(`${meshName} missing from the armature`)
  const position = obj.geometry.attributes.position
  const index = obj.geometry.index
  if (!index) throw new Error(`${meshName} is not indexed`)
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  let total = 0
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(position, index.getX(i))
    b.fromBufferAttribute(position, index.getX(i + 1))
    c.fromBufferAttribute(position, index.getX(i + 2))
    total += a.dot(new Vector3().crossVectors(b, c)) / 6
  }
  return total
}

describe('R1 depth: the profile reads as a body, not a cutout', () => {
  it('the ribcage is an ellipse: Z depth is 0.58-0.82 of X width', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const p = deriveProportions()
    const chestY = p.legH + p.pelvisH + p.spineH + p.chestH * 0.36
    const e = extentInYBand(root, 'torsoMass', chestY - 0.004, chestY + 0.004)
    const ratio = (e.maxZ - e.minZ) / (e.maxX - e.minX)
    expect(ratio).toBeGreaterThan(0.58)
    expect(ratio).toBeLessThan(0.82)
    figure.dispose()
  })

  it('the spine curves: seat and upper back project behind a tucked waist', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const p = deriveProportions()
    const seat = extentInYBand(root, 'torsoMass', p.legH + p.pelvisH * 0.5, p.legH + p.pelvisH * 0.8)
    const waistY = p.legH + p.pelvisH + p.spineH * 0.42
    const waist = extentInYBand(root, 'torsoMass', waistY - 0.004, waistY + 0.004)
    const chestY = p.legH + p.pelvisH + p.spineH + p.chestH * 0.58
    const chest = extentInYBand(root, 'torsoMass', chestY - 0.004, chestY + 0.004)
    expect(seat.maxZ).toBeGreaterThan(waist.maxZ + 0.02)
    expect(chest.maxZ).toBeGreaterThan(waist.maxZ + 0.015)
    // ...and the chest projects forward of the waist, so the front line is
    // not a straight edge either: -Z is forward.
    expect(chest.minZ).toBeLessThan(waist.minZ - 0.015)
    figure.dispose()
  })

  it('the nose is the frontmost geometry on the head', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const head = root.getObjectByName('head')
    if (!head) throw new Error('head group missing')
    const v = new Vector3()
    let headMin = Infinity
    head.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh || !mesh.geometry) return
      const position = mesh.geometry.attributes.position
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i)
        mesh.localToWorld(v)
        headMin = Math.min(headMin, v.z)
      }
    })
    const nose = extentInYBand(root, 'nose', 0, 2)
    expect(nose.minZ).toBeLessThan(headMin + 1e-6)
    figure.dispose()
  })

  it('the thigh carries clearly more mass than the calf', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const thigh = extentInYBand(root, 'legMassL', 0.66, 0.72)
    const calf = extentInYBand(root, 'legMassL', 0.30, 0.36)
    expect(thigh.maxX - thigh.minX).toBeGreaterThan((calf.maxX - calf.minX) * 1.15)
    expect(thigh.maxZ - thigh.minZ).toBeGreaterThan((calf.maxZ - calf.minZ) * 1.1)
    figure.dispose()
  })

  it('every mass is wound outward', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    const names = ['torsoMass', 'neck', 'skull', 'hairCrown', 'collar', 'bootL', 'bootR',
      'armMassL', 'armMassR', 'legMassL', 'legMassR']
    for (const name of names) {
      expect(signedVolume(root, name), name).toBeGreaterThan(0)
    }
    figure.dispose()
  })
})
