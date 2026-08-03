// vehicle-shop/harvester/src/model/machinery.test.ts
// Per-component invariant for the deck machinery — split out of the old
// src/components.test.ts (round I0). See hull.test.ts for why the split
// exists, and testSupport.ts for the shared mats()/bounds()/named() helpers.
//
// I5 additions: the defect-flag pin (a blind panelist on the I3 milestone
// panel reported a rounded object dipping below the track line in rear34 —
// traced to hull.ts's tail underframe slab, which measures min.y = 0.00
// exactly, touching but not clipping; out of this round's ownership, so the
// guard pinned here is on OUR OWN new geometry, where the real risk sits
// once hoppers/pipes/rails/masts all landed in one pass); the railing
// height; and cab-envelope clearance now that the deck is much fuller.
//
// I5 pass 2: rails now span the true open-deck z-range and cross the nose
// plate's step (mixed base heights, so the old uniform-height rail test is
// replaced); the discharge chute (destination 5) is a deliberate, named
// exception to "everything sits on the deck" — excluded from that bound and
// checked against the ground-plane pin instead; mast-head and figure-wiring
// pins are new per this pass's own destinations.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { buildMachinery } from './machinery'
import { buildCab } from './cab'
import { RAIL_HEIGHT } from './machineryDetail'
import { FIGURE } from './figure'
import { BODY } from '../spec'
import { mats, bounds, named } from './testSupport'

/** Bounds of every mesh in `group` EXCEPT those named `exclude` — the
 *  discharge chute is a deliberate, tested exception to "machinery sits on
 *  the deck" (destination 5), so the general invariant is checked on
 *  everything else, not weakened for everything. */
function boundsExcluding(group: Object3D, exclude: string): { min: Vector3; max: Vector3 } {
  group.updateMatrixWorld(true)
  const box = new Box3()
  group.traverse((child) => {
    const mesh = child as Object3D & Mesh
    if (!mesh.isMesh || !mesh.geometry || mesh.name === exclude) return
    box.union(new Box3().setFromObject(mesh))
  })
  return { min: box.min, max: box.max }
}

describe('machinery component', () => {
  it('stays on the deck, inside the hull plan (the discharge chute excepted — see destination 5)', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const b = boundsExcluding(group, 'dischargeChute')
    // Pass 2: the outer rail now crosses the nose plate's step (destination
    // 3), so its forward segment legitimately stands on the LOWER plate top
    // (hullDetail's NOSE_DECK_STEPS, 11.25) rather than BODY.deckTop (12.0).
    // 1m of slack covers that one known, tested case without hiding a part
    // that actually fell toward the ground.
    expect(b.min.y).toBeGreaterThanOrEqual(BODY.deckTop - 1)
    expect(Math.abs(b.max.x)).toBeLessThan(BODY.halfWidth + 0.2)
    expect(b.min.z).toBeGreaterThan(BODY.noseZ)
    expect(b.max.z).toBeLessThan(BODY.tailZ)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('never dips below the local ground plane — the I3 panel defect flag, pinned', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const b = bounds(group)
    expect(b.min.y).toBeGreaterThanOrEqual(0)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('the discharge chute stays at/above the ground line (destination 5)', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const chutes = named(group, 'dischargeChute')
    expect(chutes.length).toBeGreaterThanOrEqual(1)
    for (const chute of chutes) {
      const b = bounds(chute)
      expect(b.min.y).toBeGreaterThanOrEqual(0)
      expect(b.min.y).toBeLessThan(BODY.deckTop) // it must actually dip, or it isn't doing its job
    }
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('rails the open deck edges about a metre high, standing on their own local deck top', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const posts = named(group, 'deckRailPost')
    expect(posts.length).toBeGreaterThanOrEqual(4)
    for (const post of posts) {
      const b = bounds(post)
      // Pass 2: the run now crosses the nose plate's step, so a post's own
      // base sits at EITHER the normal deck top or the stepped one — always
      // exactly RAIL_HEIGHT tall, whichever plate it stands on.
      expect(b.max.y - b.min.y).toBeCloseTo(RAIL_HEIGHT, 1)
      expect(b.min.y).toBeLessThanOrEqual(BODY.deckTop + 0.05)
      expect(b.min.y).toBeGreaterThan(BODY.deckTop - 1) // well clear of a stray ground-level part
    }
    const tops = named(group, 'deckRailTop')
    expect(tops.length).toBeGreaterThanOrEqual(4) // 2 segments (nose step) x 2 sides
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('the outer rail spans the true open-deck z-range, at |x| near the deck edge (destination 3)', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const tops = named(group, 'deckRailTop')
    let zMin = Infinity
    let zMax = -Infinity
    for (const top of tops) {
      const b = bounds(top)
      zMin = Math.min(zMin, b.min.z)
      zMax = Math.max(zMax, b.max.z)
      // Near the true edge: inboard of it, but not tucked away deep inside
      // (pass 1's "inboard platform" complaint) — within a metre of it.
      expect(Math.abs((b.min.x + b.max.x) / 2)).toBeGreaterThan(BODY.halfWidth - 1)
    }
    // Reaches close to both ends of the hull's own "open mid-section"
    // bounds (the same two constants hull.ts's flank panels use).
    expect(zMin).toBeLessThanOrEqual(BODY.noseBlockAftZ + 0.5)
    expect(zMax).toBeGreaterThanOrEqual(BODY.tailBlockForeZ - 0.5)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('both light masts carry a head above their own pole top (destination 4)', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const heads = named(group, 'lightMastHead')
    const poles = named(group, 'lightMastPole')
    expect(heads.length).toBe(2)
    expect(poles.length).toBe(2)
    for (const head of heads) {
      const headBounds = bounds(head)
      // Find the pole sharing this head's (x, z) footprint.
      const pole = poles.find((p) => Math.abs(p.position.x - head.position.x) < 0.01 && Math.abs(p.position.z - head.position.z) < 0.01)
      expect(pole).toBeDefined()
      const poleBounds = bounds(pole as Object3D)
      expect(headBounds.min.y).toBeGreaterThanOrEqual(poleBounds.max.y - 0.01)
    }
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('the assembled group contains the 1.8m figure at its placed position (figure-wiring pin)', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const parts = ['figureLegs', 'figureTorso', 'figureHead'].flatMap((n) => named(group, n))
    expect(parts.length).toBe(3)
    const box = new Box3()
    for (const part of parts) box.union(new Box3().setFromObject(part))
    const size = box.getSize(new Vector3())
    expect(size.y).toBeCloseTo(FIGURE.height, 1)
    expect(box.min.y).toBeCloseTo(BODY.deckTop, 1)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(FIGURE.x, 1)
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(FIGURE.z, 1)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('keeps every fixture clear of the cab envelope', () => {
    const m = mats()
    const { group: machineryGroup } = buildMachinery(m.dark, m.accent)
    const { group: cabGroup } = buildCab(m.body, m.dark, m.accent)
    cabGroup.updateMatrixWorld(true)
    const cabBox = new Box3().setFromObject(cabGroup)
    machineryGroup.updateMatrixWorld(true)
    let offenders = 0
    machineryGroup.traverse((child) => {
      const mesh = child as Object3D & Mesh
      if (!mesh.isMesh || !mesh.geometry) return
      const box = new Box3().setFromObject(mesh)
      if (box.intersectsBox(cabBox)) offenders++
    })
    expect(offenders).toBe(0)
    machineryGroup.clear()
    cabGroup.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
