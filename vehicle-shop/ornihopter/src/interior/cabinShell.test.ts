// vehicle-shop/ornihopter/src/interior/cabinShell.test.ts
// Round 4b regression guard: the floor and rear bulkhead must be built from
// the hull's own skin, not a flat COCKPIT.clearWidth box that pokes past it
// (the "black tray and wall" a lead's eyes caught in side/hero/rear34 —
// progress.md, round 4's biggest remaining gap). Every vertex of both meshes
// is checked against the SAME isOutsideHull predicate the wing-clearance
// suite trusts, so the render and this test can never quietly disagree.
//
// PROVEN FALSIFIABLE: run against the pre-fix cabinShell.ts (a flat box at
// COCKPIT.clearWidth for both floor and bulkhead), the first two `it` blocks
// below failed — see this round's report for the exact failing output.

import { describe, it, expect } from 'vitest'
import type { Group, Object3D } from 'three'
import { createCabinShell } from './cabinShell'
import { isOutsideHull } from '../model/geometry/hullProfile'
import { hullInteriorHalfWidthAt } from './hullSection'
import { COCKPIT } from '../spec'
import { FLOOR_FRONT_Z, FLOOR_REAR_Z } from './layout'

/** Real clearance required inside the skin — looser than hullSection.ts's own
 *  HULL_INSET so float slack in the mesh build cannot make an honest pass
 *  read as a coincidental one. */
const MARGIN = 0.02

interface PositionAttr {
  count: number
  getX(i: number): number
  getY(i: number): number
  getZ(i: number): number
}

function worldVertices(root: Group, name: string): { x: number; y: number; z: number }[] {
  const part = root.getObjectByName(name)
  if (!part) throw new Error(`cabinShell part not found: ${name}`)
  const out: { x: number; y: number; z: number }[] = []
  part.traverse((child) => {
    const mesh = child as Object3D & {
      isMesh?: boolean
      geometry?: { attributes: { position?: PositionAttr } }
    }
    const position = mesh.isMesh ? mesh.geometry?.attributes.position : undefined
    if (!position) return
    for (let i = 0; i < position.count; i++) {
      out.push({
        x: position.getX(i) + mesh.position.x,
        y: position.getY(i) + mesh.position.y,
        z: position.getZ(i) + mesh.position.z,
      })
    }
  })
  return out
}

describe('cabin floor and bulkhead are contained by the actual hull skin (round 4b)', () => {
  it('every floor vertex sits inside the hull skin, with margin', () => {
    const shell = createCabinShell()
    const verts = worldVertices(shell.group, 'floor')
    expect(verts.length).toBeGreaterThan(0)
    for (const v of verts) {
      expect(isOutsideHull(v.x, v.y, v.z, MARGIN)).toBe(false)
    }
    shell.dispose()
  })

  it('every bulkhead vertex sits inside the hull skin, with margin', () => {
    const shell = createCabinShell()
    const verts = worldVertices(shell.group, 'bulkhead')
    expect(verts.length).toBeGreaterThan(0)
    for (const v of verts) {
      expect(isOutsideHull(v.x, v.y, v.z, MARGIN)).toBe(false)
    }
    shell.dispose()
  })

  it('the floor still spans a real width under both seats (nothing over-corrected to a sliver)', () => {
    const seatEdgeX = COCKPIT.seatOffsetX + COCKPIT.seatWidth / 2
    for (const z of [COCKPIT.seatZ - 0.25, COCKPIT.seatZ, COCKPIT.seatZ + 0.25]) {
      expect(hullInteriorHalfWidthAt(COCKPIT.floorY, z)).toBeGreaterThan(seatEdgeX)
    }
  })

  it('hullInteriorHalfWidthAt stays inside the hull at fine resolution across the whole floor span', () => {
    // Independent of how many segments the mesh itself uses — sampled far
    // finer than createCabinShell's own segment count, so an implementation
    // that under-segmented and bulged mid-span would still be caught here.
    for (let z = FLOOR_FRONT_Z; z <= FLOOR_REAR_Z; z += 0.05) {
      const w = hullInteriorHalfWidthAt(COCKPIT.floorY, z)
      if (w <= 0) continue
      expect(isOutsideHull(w, COCKPIT.floorY, z, MARGIN)).toBe(false)
    }
  })
})
