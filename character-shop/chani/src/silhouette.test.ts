// character-shop/chani/src/silhouette.test.ts
// R1 "body and silhouette" measured bar (character-shop/docs/
// gauntlet-loop.md): shoulder/hip half-widths within +/-10% of spec,
// bilateral symmetry, and every vertex inside [0, heightM*1.02] in Y.
// seam.test.ts (lead-owned) covers height/face-forward/eye-line and is
// untouched by this file.
//
// R1 pass 2 (progress.md): the body rebuilt around ONE lathed torso mesh
// ('torsoMass') instead of separate 'chestMass'/'pelvisMass' cylinders, so
// the width measurement changed from "Box3 over a whole named mesh" to
// "scan torsoMass's own vertices, keep the ones whose world Y falls in a
// band, take the max |X|". Each band is wide enough to certainly contain
// the specific torsoProfile (torso.ts) ring it targets, and narrow enough
// that the OTHER nearby control point never falls in by accident — see
// the comment at each band. Shoulder/hip half-width is still cross-checked
// at the JOINT (armL/armR, legL/legR group world position), unchanged from
// pass 1: a neutral A-pose arm leaning ~27deg off the body swings its
// elbow well outside any +/-10% band around 0.195m regardless of whether
// the proportion itself is correct, so the swung limb's own bounding box
// is never the right thing to measure against
// PROPORTIONS.shoulderHalfWidth/hipHalfWidth.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { createChani } from './model/Chani'
import { deriveProportions } from './model/proportions'
import { PROPORTIONS } from './spec'

function worldX(root: Object3D, name: string): number {
  const obj = root.getObjectByName(name)
  if (!obj) throw new Error(`${name} missing from the armature`)
  const v = new Vector3()
  obj.getWorldPosition(v)
  return v.x
}

function boxOf(root: Object3D, name: string): Box3 {
  const obj = root.getObjectByName(name)
  if (!obj) throw new Error(`${name} missing from the armature`)
  return new Box3().setFromObject(obj)
}

/** Max |X| among a named mesh's own vertices whose WORLD Y falls in
 *  [yMin, yMax] — the silhouette half-width at that height band. */
function maxAbsXInYBand(root: Object3D, meshName: string, yMin: number, yMax: number): number {
  const obj = root.getObjectByName(meshName) as unknown as Mesh
  if (!obj) throw new Error(`${meshName} missing from the armature`)
  obj.updateMatrixWorld(true)
  const position = obj.geometry.attributes.position
  const v = new Vector3()
  let max = 0
  let found = false
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    obj.localToWorld(v)
    if (v.y >= yMin && v.y <= yMax) {
      found = true
      max = Math.max(max, Math.abs(v.x))
    }
  }
  if (!found) throw new Error(`${meshName} has no geometry with world Y in [${yMin}, ${yMax}]`)
  return max
}

function withinTenPercent(value: number, spec: number): void {
  expect(value).toBeGreaterThan(spec * 0.9)
  expect(value).toBeLessThan(spec * 1.1)
}

describe('R1: shoulder and hip half-widths within 10% of spec', () => {
  it('the arm joints sit within 10% of shoulderHalfWidth', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const half = (Math.abs(worldX(root, 'armL')) + Math.abs(worldX(root, 'armR'))) / 2
    withinTenPercent(half, PROPORTIONS.shoulderHalfWidth)
    figure.dispose()
  })

  it('the leg joints sit within 10% of hipHalfWidth', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const half = (Math.abs(worldX(root, 'legL')) + Math.abs(worldX(root, 'legR'))) / 2
    withinTenPercent(half, PROPORTIONS.hipHalfWidth)
    figure.dispose()
  })

  it('torsoMass reads shoulderHalfWidth at the shoulder line', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const p = deriveProportions()
    // Top 30% of the chest region: certainly contains torsoProfile's final
    // (topY) ring; its other chest control point (chestH*0.45) sits well
    // below this band.
    const top = p.legH + p.pelvisH + p.spineH + p.chestH
    const half = maxAbsXInYBand(root, 'torsoMass', top - p.chestH * 0.3, top + 0.001)
    withinTenPercent(half, PROPORTIONS.shoulderHalfWidth)
    figure.dispose()
  })

  it('torsoMass reads hipHalfWidth at the hip line', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const p = deriveProportions()
    // Upper-middle 35% of the pelvis: certainly contains torsoProfile's
    // hip-peak ring (authored at pelvisH*0.82); neighbouring control
    // points (pelvisH*0.4 and pelvisH*1.0) sit outside this band.
    const base = p.legH
    const half = maxAbsXInYBand(root, 'torsoMass', base + p.pelvisH * 0.6, base + p.pelvisH * 0.95)
    withinTenPercent(half, PROPORTIONS.hipHalfWidth)
    figure.dispose()
  })
})

describe('R1: bilateral symmetry', () => {
  function expectMirroredX(root: Object3D, leftName: string, rightName: string): void {
    const left = boxOf(root, leftName)
    const right = boxOf(root, rightName)
    expect(Math.abs(-left.max.x - right.min.x)).toBeLessThan(0.005)
    expect(Math.abs(-left.min.x - right.max.x)).toBeLessThan(0.005)
    expect(Math.abs(left.min.y - right.min.y)).toBeLessThan(0.005)
    expect(Math.abs(left.max.y - right.max.y)).toBeLessThan(0.005)
    expect(Math.abs(left.min.z - right.min.z)).toBeLessThan(0.005)
    expect(Math.abs(left.max.z - right.max.z)).toBeLessThan(0.005)
  }

  it('armL and armR bounding boxes mirror within 5mm in X', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    expectMirroredX(root, 'armL', 'armR')
    figure.dispose()
  })

  it('legL and legR bounding boxes mirror within 5mm in X', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    expectMirroredX(root, 'legL', 'legR')
    figure.dispose()
  })
})

describe('R1: every vertex stays inside [0, heightM * 1.02] in Y', () => {
  it('the whole figure bounding box is within the Y budget', () => {
    const figure = createChani()
    const root = figure.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root)
    expect(box.min.y).toBeGreaterThanOrEqual(-0.001)
    expect(box.max.y).toBeLessThanOrEqual(PROPORTIONS.heightM * 1.02)
    figure.dispose()
  })
})
