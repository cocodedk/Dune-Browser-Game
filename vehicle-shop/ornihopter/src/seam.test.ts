// vehicle-shop/ornihopter/src/seam.test.ts
// Bar item Q4.1, guarded at the seam between the flight model and the
// geometry. Lead-owned: it deliberately sits outside src/flight, src/model and
// src/interior, because the defect it exists to catch lives BETWEEN them and
// no single builder can see it.
//
// Why this file exists at all. src/flight/noseLeads.test.ts asserts
// dot(nose, normalise(velocity)) > 0.99 and passes at exactly 1.0 — because
// kinematics.ts DEFINES velocity as nose * speed. normalise(velocity) IS nose,
// so that dot product is identically 1 for every orientation, including a
// completely wrong one. It cannot fail, and it never touches the hull.
//
// The historical bug was never inside the flight model. The previous in-game
// ornithopter flew tail-first for months because the hull was modelled
// nose-along -Z while the yaw helper aimed +Z along travel — a disagreement
// between two files that were each self-consistent. Three blind critics missed
// it. So the assertions below are chained through three independent sources:
//
//   1. GEOMETRY  the hull's blunt end is measured off the real BufferGeometry
//   2. SPEC      the pilot sits at that same end (spec.ts PILOT_EYE)
//   3. FLIGHT    the craft travels toward that end in world space
//
// Identifying the nose by coordinate would reintroduce the vacuum: asserting
// "the min-local-Z end leads" passes happily on a hull built backwards,
// because on that hull the min-Z end IS the tail. The nose is therefore
// identified PHYSICALLY — it is the blunt, tall end — never by its sign.

import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import type { Object3D, Mesh } from 'three'
import { createOrnithopter } from './model/Ornithopter'
import { createFlightModel } from './flight/flightModel'
import { OVERALL, PILOT_EYE } from './spec'
import { normalise, dot, rotate } from './contracts'
import type { Vec3 } from './contracts'

/** Every vertex of the craft, in craft-local space. */
function localVertices(root: Object3D): Vec3[] {
  root.updateMatrixWorld(true)
  const out: Vec3[] = []
  const v = new Vector3()
  root.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const position = mesh.geometry.attributes.position
    if (!position) return
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i)
      // Into the craft root's frame, not the world's — the root's own
      // transform is main.ts's to set and is irrelevant here.
      mesh.localToWorld(v)
      root.worldToLocal(v)
      out.push({ x: v.x, y: v.y, z: v.z })
    }
  })
  return out
}

/**
 * Vertical extent of the fuselage in a band of craft-local z. Vertices far out
 * along X are wings and are excluded: wings are broad in X and thin in Y, and
 * would otherwise drown out the hull they are attached to.
 */
function fuselageHeightInBand(vertices: Vec3[], zLow: number, zHigh: number): number {
  const nearCentreline = OVERALL.bodyWidth * 0.55
  let extent = 0
  for (const p of vertices) {
    if (p.z < zLow || p.z >= zHigh) continue
    if (Math.abs(p.x) > nearCentreline) continue
    extent = Math.max(extent, Math.abs(p.y))
  }
  return extent
}

describe('seam: the craft flies toward the end the pilot sits in', () => {
  it('the hull is blunt at one end and fine at the other', () => {
    const craft = createOrnithopter()
    const vertices = localVertices(craft.root as unknown as Object3D)
    const half = OVERALL.length / 2

    // Sample well inboard of both extremities, so a pointed tip at either end
    // is not what decides it.
    const forward = fuselageHeightInBand(vertices, -half * 0.75, -half * 0.45)
    const aft = fuselageHeightInBand(vertices, half * 0.45, half * 0.75)

    expect(forward).toBeGreaterThan(0)
    expect(aft).toBeGreaterThan(0)
    // A real difference, not a rounding one: this craft has a deep cockpit and
    // a slender tail boom, so the blunt end should be comfortably taller.
    expect(forward / aft).toBeGreaterThan(1.5)
    craft.dispose()
  })

  it('the pilot sits at the blunt end, not the fine end', () => {
    const craft = createOrnithopter()
    const vertices = localVertices(craft.root as unknown as Object3D)

    // Where the fuselage carries its vertical bulk, as a single signed number:
    // the |y|-weighted mean of z over near-centreline vertices. A deep cockpit
    // forward and a fine tail boom aft put this ahead of the geometric centre.
    //
    // Deliberately NOT a comparison of two band measurements against a
    // constant. The first version of this test compared `forward > aft` to
    // `PILOT_EYE.z < 0` — but the latter is a fixed value from spec.ts, so the
    // assertion silently reduced to re-checking the test above, and when a
    // mirrored hull degenerated both bands to zero it compared 0 > 0 and
    // PASSED on exactly the defect it was written to catch. A single
    // continuous measure cannot collapse that way.
    const nearCentreline = OVERALL.bodyWidth * 0.55
    let weighted = 0
    let weight = 0
    for (const p of vertices) {
      if (Math.abs(p.x) > nearCentreline) continue
      const w = Math.abs(p.y)
      weighted += w * p.z
      weight += w
    }
    expect(weight).toBeGreaterThan(0)
    const bulkCentroidZ = weighted / weight

    // The bulk must sit on the same side of centre as the seat. Mirror the
    // hull without moving the seat and these signs disagree.
    expect(Math.abs(bulkCentroidZ)).toBeGreaterThan(0.2)
    expect(Math.sign(bulkCentroidZ)).toBe(Math.sign(PILOT_EYE.z))
    craft.dispose()
  })

  it('travel direction points toward the pilot end of the craft', () => {
    const model = createFlightModel()
    for (let i = 0; i < 200; i++) {
      model.step({ pitch: 0, roll: 0, yaw: 0, throttle: 0.6 }, 0.02)
    }

    const state = model.state
    expect(state.speed).toBeGreaterThan(1)

    // The craft-local direction from the centre of the craft toward the seat.
    // This is what "forward" means physically: the end the crew face out of.
    const towardPilot = normalise({ x: PILOT_EYE.x, y: PILOT_EYE.y, z: PILOT_EYE.z })
    // Into world space through the orientation the flight model actually
    // produced, which is exactly what main.ts writes onto the craft root.
    const towardPilotWorld = rotate(state.orientation, towardPilot)
    const travel = normalise(state.velocity)

    // Tail-first flight reads about -1 here. This is the assertion the old
    // craft would have failed, and its own nose-leads test did not.
    expect(dot(towardPilotWorld, travel)).toBeGreaterThan(0.9)
  })

  it('holds through a turn, when orientation and travel could diverge', () => {
    const model = createFlightModel()
    for (let i = 0; i < 300; i++) {
      model.step({ pitch: 0.2, roll: 1, yaw: 0, throttle: 0.6 }, 0.02)
    }

    const state = model.state
    const towardPilotWorld = rotate(
      state.orientation,
      normalise({ x: PILOT_EYE.x, y: PILOT_EYE.y, z: PILOT_EYE.z })
    )
    expect(dot(towardPilotWorld, normalise(state.velocity))).toBeGreaterThan(0.9)
  })
})

describe('seam: the craft the flight model drives is the one that was built', () => {
  it('has eight wings, measured off geometry rather than counted off a name', () => {
    const craft = createOrnithopter()
    const root = craft.root as unknown as Object3D
    root.updateMatrixWorld(true)

    // A wing is a mesh reaching well beyond the hull's beam. Counting by X
    // reach rather than by node name means renaming a pivot cannot quietly
    // change the answer.
    const reachLimit = OVERALL.bodyWidth
    const v = new Vector3()
    let wings = 0
    root.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh || !mesh.geometry) return
      const position = mesh.geometry.attributes.position
      if (!position) return
      let reach = 0
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i)
        mesh.localToWorld(v)
        root.worldToLocal(v)
        reach = Math.max(reach, Math.abs(v.x))
      }
      if (reach > reachLimit) wings++
    })

    expect(wings).toBe(8)
    craft.dispose()
  })
})
