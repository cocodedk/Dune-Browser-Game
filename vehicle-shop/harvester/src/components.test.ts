// vehicle-shop/harvester/src/components.test.ts
// Per-component invariants, so each of the five parts can be built and
// verified on its own before the assembly is trusted. The seam test guards
// the whole machine; this guards the parts.
//
// Each component is built with throwaway materials and measured off the REAL
// geometry (Box3), never off spec constants — a stale spec entry and a stale
// builder cannot cancel each other out.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3, Group, MeshStandardMaterial } from 'three'
import type { Object3D } from 'three'
import { buildHull } from './model/hull'
import { buildTracks } from './model/tracks'
import { buildCutter } from './model/cutter'
import { buildCab } from './model/cab'
import { buildMachinery } from './model/machinery'
import { BOOM, BODY, CAB, OVERALL } from './spec'

function mats() {
  return {
    body: new MeshStandardMaterial(),
    dark: new MeshStandardMaterial(),
    wheel: new MeshStandardMaterial(),
    accent: new MeshStandardMaterial(),
  }
}

function bounds(group: Object3D): { min: Vector3; max: Vector3; size: Vector3 } {
  group.updateMatrixWorld(true)
  const box = new Box3().setFromObject(group)
  const size = box.getSize(new Vector3())
  return { min: box.min, max: box.max, size }
}

describe('hull component', () => {
  it('is symmetric in X and spans the hull length', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const b = bounds(group)
    expect(Math.abs(b.min.x + b.max.x)).toBeLessThan(1e-6)
    expect(b.min.z).toBeCloseTo(BODY.noseZ, 0)
    expect(b.max.z).toBeCloseTo(BODY.tailZ, 0)
    expect(b.size.y).toBeGreaterThan(10)
    for (const mat of Object.values(m)) mat.dispose()
  })
})

describe('tracks component', () => {
  it('has twenty-six runners (6 road wheels + 2 sprockets + 5 rollers per side) and a symmetric footprint', () => {
    const m = mats()
    const { group } = buildTracks(m.dark, m.wheel)
    let wheels = 0
    group.traverse((child) => {
      if (child.name === 'wheel') wheels++
    })
    expect(wheels).toBe(26)
    const b = bounds(group)
    // Both pods reach the same distance from the centreline.
    expect(Math.abs(b.min.x)).toBeCloseTo(Math.abs(b.max.x), 1)
    expect(b.min.x).toBeLessThan(-14)
    // The band sits on the ground line.
    expect(b.min.y).toBeCloseTo(0, 0)
    expect(b.max.y).toBeGreaterThan(10)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})

describe('cutter component', () => {
  it('is the frontmost part, its teeth reaching the tip line', () => {
    const m = mats()
    const { group } = buildCutter(m.dark, m.accent)
    const b = bounds(group)
    expect(b.min.z).toBeLessThan(BOOM.tipZ)
    expect(b.min.z).toBeGreaterThan(BOOM.tipZ - 2)
    // The head is wide — the signature read from a hero shot.
    expect(b.size.x).toBeGreaterThan(BOOM.cutterHalfWidth * 2 - 1)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})

describe('cab component', () => {
  it('sits on the deck and reaches the authored roof', () => {
    const m = mats()
    const { group } = buildCab(m.body, m.dark, m.accent)
    const b = bounds(group)
    expect(b.min.y).toBeCloseTo(BODY.deckTop, 0)
    // The antenna pokes above the roof; the roof itself is at CAB.topY.
    expect(b.max.y).toBeLessThanOrEqual(CAB.topY + 2)
    expect(Math.abs(b.min.x)).toBeLessThanOrEqual(CAB.halfWidth + 0.5)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})

describe('machinery component', () => {
  it('stays on the deck, inside the hull plan', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const b = bounds(group)
    expect(b.min.y).toBeGreaterThanOrEqual(BODY.deckTop - 0.1)
    expect(Math.abs(b.max.x)).toBeLessThan(BODY.halfWidth + 0.2)
    expect(b.min.z).toBeGreaterThan(BODY.noseZ)
    expect(b.max.z).toBeLessThan(BODY.tailZ)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})

describe('whole machine still meets its footprint', () => {
  it('assembled footprint matches OVERALL within the seam-test windows', () => {
    const m = mats()
    const root = new Group()
    root.add(buildHull(m.body, m.dark).group)
    root.add(buildTracks(m.dark, m.wheel).group)
    root.add(buildCutter(m.dark, m.accent).group)
    root.add(buildCab(m.body, m.dark, m.accent).group)
    root.add(buildMachinery(m.dark, m.accent).group)
    const b = bounds(root)
    expect(b.size.z).toBeGreaterThan(OVERALL.length - 2)
    expect(b.size.z).toBeLessThan(OVERALL.length + 2)
    expect(b.size.x).toBeGreaterThan(OVERALL.width - 2)
    expect(b.size.x).toBeLessThan(OVERALL.width + 2)
    expect(b.size.y).toBeLessThan(OVERALL.height + 2)
    root.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
