// vehicle-shop/ornihopter/src/interior/controlsArticulation.test.ts
// ROUND 9c guard. Round 7's interior critic on the brow-hung arm: "one smooth,
// unbroken cylinder — no knuckles, no hinge blocks, no clamps — with a black
// helix wound around it and a ball stuck on its FLANK, not its end. Nothing
// about it reads as articulated, or as a thing a hand grips." It also crossed
// the round-9b standby cluster (progress.md's carry note).
//
// FAIL-FIRST, measured against the tree at commit b5963dd (round 9b landed,
// 9c not started): no node anywhere in the cockpit is named 'cyclic',
// 'collective' or 'control-conduit' — every count below is 0 and every
// existence check fails. Recorded RED, not asserted away.
//
// docs/apache-gauntlet.md B4.4: "controls on the correct sides (cyclic
// centre/right of seat, collective left), neither crossing the central
// sightline cone." "Centre/right" and "left" are the PILOT's own hand sense —
// spec.ts fixes +X as the craft's right/starboard, which is also the pilot's
// own right since the pilot faces -Z — so a cyclic leaning INBOARD moves
// toward larger x, and a collective at the pilot's left sits at x < seat x.

import { describe, it, expect, afterAll } from 'vitest'
import { Box3, Vector3, type Object3D } from 'three'
import { createCockpit } from './Cockpit'
import { seatX, OVERHEAD } from './layout'

const cockpit = createCockpit()
const root = cockpit.root as unknown as Object3D
root.updateMatrixWorld(true)

afterAll(() => cockpit.dispose())

function allNamed(from: Object3D, name: string): Object3D[] {
  const found: Object3D[] = []
  from.traverse((child) => {
    if (child.name === name) found.push(child)
  })
  return found
}

function allMeshX(from: Object3D): number[] {
  const xs: number[] = []
  from.traverse((child) => {
    if ((child as Object3D & { isMesh?: boolean }).isMesh) {
      xs.push(child.getWorldPosition(new Vector3()).x)
    }
  })
  return xs
}

function worldY(o: Object3D): number {
  return o.getWorldPosition(new Vector3()).y
}

describe('the cyclic reads as an articulated stick, not a smooth post (B2, B4.4)', () => {
  const cyclics = allNamed(root, 'cyclic')
  const tubes = cyclics.length ? allNamed(cyclics[0], 'cyclic-tube') : []
  const knuckles = cyclics.length ? allNamed(cyclics[0], 'cyclic-knuckle') : []
  const grips = cyclics.length ? allNamed(cyclics[0], 'cyclic-grip') : []

  it('exactly one cyclic group exists', () => {
    expect(cyclics.length).toBe(1)
  })

  it('has at least 3 tube segments (was a single unbroken cylinder)', () => {
    expect(tubes.length).toBeGreaterThanOrEqual(3)
  })

  it('has at least 2 knuckle blocks (was zero: no knuckles, no hinge blocks)', () => {
    expect(knuckles.length).toBeGreaterThanOrEqual(2)
  })

  it('the grip is the TOP of the assembly — on the end, not the flank', () => {
    expect(grips.length).toBeGreaterThanOrEqual(1)
    const structure = [...tubes, ...knuckles]
    expect(structure.length).toBeGreaterThan(0)
    const gripTop = Math.max(...grips.map(worldY))
    const structureTop = Math.max(...structure.map(worldY))
    expect(gripTop).toBeGreaterThan(structureTop)
  })
})

describe("the collective sits at the pilot's left, pivot below grip (B4.4)", () => {
  const collectives = allNamed(root, 'collective')
  const pivot = collectives.length ? allNamed(collectives[0], 'collective-pivot')[0] : undefined
  const grip = collectives.length ? allNamed(collectives[0], 'collective-grip')[0] : undefined

  it('exactly one collective group exists', () => {
    expect(collectives.length).toBe(1)
  })

  it('every mesh in it sits left of the pilot seat centreline (x < seat x)', () => {
    const xs = collectives.length ? allMeshX(collectives[0]) : []
    expect(xs.length).toBeGreaterThan(0)
    const seatXPilot = seatX(-1)
    const rightmost = xs.length ? Math.max(...xs) : Infinity
    expect(rightmost).toBeLessThan(seatXPilot)
  })

  it('the pivot sits below the grip', () => {
    expect(pivot).toBeTruthy()
    expect(grip).toBeTruthy()
    if (pivot && grip) expect(worldY(pivot)).toBeLessThan(worldY(grip))
  })
})

describe('the coil conduit hangs from the overhead console, not the cyclic (B4.4)', () => {
  const conduits = allNamed(root, 'control-conduit')

  it('exactly one conduit group exists', () => {
    expect(conduits.length).toBe(1)
  })

  it('its topmost point attaches within 0.15m of the overhead underside', () => {
    const top = conduits.length ? new Box3().setFromObject(conduits[0]).max.y : NaN
    const gap = Math.abs(top - OVERHEAD.panelBottomY)
    expect(gap).toBeLessThanOrEqual(0.15)
  })

  it('is not a descendant of the cyclic group', () => {
    const cyclics = allNamed(root, 'cyclic')
    expect(cyclics.length).toBeGreaterThanOrEqual(1)
    if (cyclics.length) expect(allNamed(cyclics[0], 'control-conduit').length).toBe(0)
  })
})
