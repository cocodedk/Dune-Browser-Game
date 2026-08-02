// vehicle-shop/harvester/src/model/hull.test.ts
// Per-component invariant for the hull — split out of the old
// src/components.test.ts (round I0) so no single file carries every part's
// assertions and outgrows the 200-line cap as later rounds (I2 lands here)
// add to it. See testSupport.ts for the shared mats()/bounds() helpers.
//
// I2 adds: deck seams stay INSET (never above the deck's top plane),
// flank panels exist on the solid end blocks ONLY, the open middle's flank
// zone stays clear (the see-under gap, pinned by a test for the first
// time), and cross-members stay inside the underframe's own envelope.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3, Mesh } from 'three'
import { buildHull } from './hull'
import { BODY, TRACK } from '../spec'
import { mats, bounds, named } from './testSupport'

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

  it('deck seams are inset — no seam geometry above the deck top plane', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const seams = named(group, 'deckSeam')
    expect(seams.length).toBeGreaterThanOrEqual(3)
    for (const seam of seams) {
      const b = bounds(seam)
      expect(b.max.y).toBeLessThanOrEqual(BODY.deckTop + 1e-6)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('flank panels sit only on the solid nose/tail end blocks, read from spec', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const panels = named(group, 'flankPanel')
    expect(panels.length).toBeGreaterThan(0)
    for (const panel of panels) {
      const b = bounds(panel)
      const inNose = b.min.z >= BODY.noseZ - 1e-6 && b.max.z <= BODY.noseBlockAftZ + 1e-6
      const inTail = b.min.z >= BODY.tailBlockForeZ - 1e-6 && b.max.z <= BODY.tailZ + 1e-6
      expect(inNose || inTail).toBe(true)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('leaves the open middle flank zone clear — the see-under gap, pinned', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    group.updateMatrixWorld(true)
    // Deep inside the open span, at the flank height between the underframe
    // top and the deck underside, near the hull's own halfWidth.
    const midZ = (BODY.noseBlockAftZ + BODY.tailBlockForeZ) / 2
    const probe = new Box3(
      new Vector3(BODY.halfWidth - 0.5, BODY.underThickness + 1, midZ - 2),
      new Vector3(BODY.halfWidth + 0.5, BODY.deckTop - BODY.deckThickness - 1, midZ + 2),
    )
    let hit = false
    group.traverse((child) => {
      if (!(child instanceof Mesh)) return
      if (new Box3().setFromObject(child).intersectsBox(probe)) hit = true
    })
    expect(hit).toBe(false)
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('cross-members stay inside the underframe envelope and the pods\' inner faces', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const members = named(group, 'crossMember')
    expect(members.length).toBeGreaterThanOrEqual(2)
    const innerFace = TRACK.centreX - TRACK.housing.width / 2
    for (const member of members) {
      const b = bounds(member)
      expect(b.min.y).toBeGreaterThanOrEqual(-1e-6)
      expect(b.max.y).toBeLessThanOrEqual(BODY.underThickness + 1e-6)
      expect(Math.max(Math.abs(b.min.x), Math.abs(b.max.x))).toBeLessThan(innerFace)
    }
    for (const mat of Object.values(m)) mat.dispose()
  })
})
