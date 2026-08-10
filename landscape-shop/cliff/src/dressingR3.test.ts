// landscape-shop/cliff/src/dressingR3.test.ts
// R3's guards: the entrance-zone dressing. Measured off the BUILT geometry and
// its BUILT vertex colours — never off tools/bake/dressPlan.mjs's placement
// table, so a Cliff.ts that stopped adding the group, or a dressTone.ts that
// stopped painting it, fails here.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createCliff } from './model/Cliff'
import { DRESSING_BAKE, DRESS_MESHES } from './model/dressing'
import { MASSIF_BAKE } from './model/massif'
import { SCARS, SCAR_SOURCES } from './model/scars'
import { WIND } from './model/weathering'
import { boundsOf, entranceOf, paintedSamples, triangleCountOf } from './testHelpers'
import { pieceMeasurements, type PieceMeasure } from './dressingR3.helpers'

const DRESSING_BUDGET = 3000
// The harness ground (main.ts) is held dead flat at y = 0 over this box, and
// the released set is seated so its own y = 0 lands on the terrain. Inside it,
// "the surface a piece rests on" is y = 0 and the floaters guard below has a
// datum; outside it, it would not.
const FLAT_APRON = { halfWidthM: 340, frontZ: -260 }
// Two-sided, and NOT the literal "within 0.05 m" the round was briefed with.
// Above the datum it IS 0.05: a piece whose lowest vertex sits higher than
// that is hovering. Below it, a prop bedded into sand is correct and a prop
// lost under the ground is not, so the floor is the deepest burial the plan
// authors (driftWest, 0.93 m) with room to spare.
const SEAT = { highest: 0.05, deepest: -1.5 }

function measured(): { root: Object3D; pieces: PieceMeasure[]; dispose(): void } {
  const set = createCliff()
  const root = set.root as unknown as Object3D
  return { root, pieces: pieceMeasurements(root), dispose: () => set.dispose() }
}

function pieceNamed(pieces: PieceMeasure[], name: string): PieceMeasure {
  const found = pieces.find((piece) => piece.name === name)
  if (!found) throw new Error(`dressing piece ${name} is missing from the built set`)
  return found
}

function massNamed(name: string): { min: number[]; max: number[] } {
  const mass = MASSIF_BAKE.hierarchy.find((entry) => entry.name === name)
  if (!mass) throw new Error(`bake mass ${name} is missing`)
  return mass
}

/** Horizontal unit vector the wind travels along — the axis a sand shadow
 *  lies down. Read from model/weathering.ts, never restated here. */
function windHeading(): { x: number; z: number } {
  const length = Math.hypot(WIND.x, WIND.z) || 1
  return { x: WIND.x / length, z: WIND.z / length }
}

describe('R3: the dressing is cheap, complete and inside the set', () => {
  it('every planned piece is built, and the group costs under the budget', () => {
    const { root, pieces, dispose } = measured()
    const dressing = root.getObjectByName('dressing')
    if (!dressing) throw new Error('dressing group missing')
    expect(pieces.length).toBe(DRESSING_BAKE.pieces.length)
    expect(pieces.length).toBeGreaterThanOrEqual(12)
    for (const name of DRESS_MESHES) expect(root.getObjectByName(name)).toBeTruthy()

    const dressingTriangles = triangleCountOf(dressing)
    expect(dressingTriangles).toBe(DRESSING_BAKE.triangles)
    expect(dressingTriangles).toBeLessThan(DRESSING_BUDGET)
    // And the whole set still fits the R1 budget with it (massingR1.test.ts).
    expect(triangleCountOf(root)).toBeLessThan(25000)
    dispose()
  })

  it('nothing dressed reaches in front of the gate lip, or widens the massif', () => {
    const { root, pieces, dispose } = measured()
    const dressing = root.getObjectByName('dressing') as Object3D
    const front = boundsOf(dressing).min.z
    // seam.test.ts asserts the entrance owns the set's -Z extreme to five
    // decimal places. A dressing piece a centimetre proud of the lip would
    // fail it there with no clue why; this says why.
    expect(front).toBeGreaterThan(boundsOf(entranceOf(root)).min.z)
    for (const piece of pieces) {
      expect(Math.max(Math.abs(piece.min[0]), Math.abs(piece.max[0]))).toBeLessThanOrEqual(300)
    }
    dispose()
  })
})

describe('R3: nothing dressed floats, and nothing is buried out of sight', () => {
  it('every piece is seated on the ground plane it stands on', () => {
    const { pieces, dispose } = measured()
    for (const piece of pieces) {
      // The datum is only y = 0 where the ground really is flat — assert that
      // first, so this guard cannot quietly pass on a piece out in the dunes.
      expect(Math.max(Math.abs(piece.min[0]), Math.abs(piece.max[0])))
        .toBeLessThanOrEqual(FLAT_APRON.halfWidthM)
      expect(piece.min[2]).toBeGreaterThanOrEqual(FLAT_APRON.frontZ)
      expect(piece.min[1]).toBeLessThanOrEqual(SEAT.highest)
      expect(piece.min[1]).toBeGreaterThanOrEqual(SEAT.deepest)
    }
    dispose()
  })
})

describe('R3: the drifts lie downwind of the blocks they bank behind', () => {
  it('each drift centroid is in its anchor block own lee wedge', () => {
    const { pieces, dispose } = measured()
    const heading = windHeading()
    const drifts = pieces.filter((piece) => piece.anchor && piece.family === 'sand')
    expect(drifts.length).toBeGreaterThanOrEqual(3)
    for (const drift of drifts) {
      const block = massNamed(drift.anchor as string)
      const dx = drift.centroid[0] - (block.min[0] + block.max[0]) / 2
      const dz = drift.centroid[2] - (block.min[2] + block.max[2]) / 2
      // Downwind, with a real margin. A bare "> 0" passes on a drift set
      // straight upwind of its block with a metre of z slop, because WIND is
      // z-dominated (0.28, -0.10, 0.95) and the z term alone can carry it.
      expect(dx * heading.x + dz * heading.z).toBeGreaterThan(3)
      expect(dz).toBeGreaterThanOrEqual(0)
    }
    dispose()
  })

  it('one drift really does bury the lowest block on the flank', () => {
    const { pieces, dispose } = measured()
    const drift = pieceNamed(pieces, 'driftWest')
    const block = massNamed('talus1')
    const overlaps = (a: number[], b: number[], axis: number): boolean => (
      a[axis] < b[axis + 3] && b[axis] < a[axis + 3]
    )
    const driftBox = [...drift.min, ...drift.max]
    const blockBox = [...block.min, ...block.max]
    expect(overlaps(driftBox, blockBox, 0)).toBe(true)
    expect(overlaps(driftBox, blockBox, 2)).toBe(true)
    // Partially, not completely: the rock still shows out of the sand.
    expect(drift.max[1] / block.max[1]).toBeGreaterThan(0.45)
    expect(drift.max[1] / block.max[1]).toBeLessThan(1.3)
    dispose()
  })
})

describe('R3: every rockfall scar has fresh debris on the ground under it', () => {
  it('all three scars are reinforced, and nothing is scattered at random', () => {
    const { pieces, dispose } = measured()
    const debris = pieces.filter((piece) => piece.anchor && piece.family === 'rock')
    expect(debris.length).toBeGreaterThanOrEqual(SCAR_SOURCES.length)
    for (const piece of debris) {
      const scar = SCARS.find((entry) => entry.name === piece.anchor)
      if (!scar) throw new Error(`${piece.name} is anchored to ${piece.anchor}, which carries no scar`)
      expect(Math.abs(piece.centroid[0] - scar.centreX)).toBeLessThan(scar.halfWidth)
      expect(piece.centroid[1]).toBeLessThan(scar.bottomY)
    }
    for (const source of SCAR_SOURCES) {
      expect(debris.filter((piece) => piece.anchor === source).length).toBeGreaterThanOrEqual(1)
    }
    dispose()
  })
})

describe('R3: the dressing never becomes the bright thing in the frame', () => {
  it('no dressed surface out-shines the rock, and the goods stay under the sill', () => {
    const { root, dispose } = measured()
    const brightest = (name: string, perFace = false): number => Math.max(
      ...paintedSamples(root, name, perFace).map((sample) => sample.luminance),
    )
    const rock = brightest('massif', true)
    for (const name of DRESS_MESHES) expect(brightest(name, name !== 'dressSand')).toBeLessThanOrEqual(rock)
    // The goods sit INSIDE the mouth, so their ceiling is the mouth's own, not
    // the wall's: the sill is the brightest surface in there (massingR1.test.ts
    // measures it at about 0.19) and nothing standing on it may beat it.
    expect(brightest('dressGoods', true)).toBeLessThan(0.175)
    dispose()
  })
})
