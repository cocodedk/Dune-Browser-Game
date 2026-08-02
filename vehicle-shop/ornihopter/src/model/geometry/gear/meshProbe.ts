// vehicle-shop/ornihopter/src/model/geometry/gear/meshProbe.ts
// Reading the finished landing-gear buffer back, for the tests that judge
// ANATOMY rather than winding.
//
// The pattern is flight/testHelpers.ts's: a probe lives beside the thing it
// probes, so a test can ask a question of the real mesh instead of re-deriving
// what the mesh ought to contain. Everything here works on
// buildLandingGearGeometry()'s output — the same buffer three.js draws, after
// the mirror — so a claim proved here is a claim about the rendered craft.
//
// Vertices are attributed to a leg by nearest key point rather than by build
// order on purpose: build order is exactly what a refactor changes, and a test
// that silently re-labels its own data when the builder is reordered is not a
// test.

import { buildLandingGearGeometry } from '../gearGeometry'
import { GEAR_LEGS, type GearLeg } from './stance'

export interface GearMesh {
  readonly positions: readonly number[]
  readonly indices: readonly number[]
  /** Vertex index to index into GEAR_LEGS. */
  readonly legOfVertex: readonly number[]
  readonly vertexCount: number
}

function keyPoints(leg: GearLeg): readonly (readonly [number, number, number])[] {
  return [leg.hip, leg.hipSkin, leg.braceHip, leg.braceHipSkin,
    leg.knee, leg.braceNode, leg.ankle, leg.foot]
    .map((p) => [p.x, p.y, p.z] as const)
}

const KEYS = GEAR_LEGS.map(keyPoints)

function nearestLeg(x: number, y: number, z: number): number {
  let best = 0
  let bestDistance = Infinity
  for (let i = 0; i < KEYS.length; i++) {
    for (const k of KEYS[i]) {
      const d = (x - k[0]) ** 2 + (y - k[1]) ** 2 + (z - k[2]) ** 2
      if (d < bestDistance) {
        bestDistance = d
        best = i
      }
    }
  }
  return best
}

export function readGearMesh(): GearMesh {
  const geometry = buildLandingGearGeometry()
  const positions = Array.from(geometry.attributes.position.array as Float32Array)
  const indices = Array.from(geometry.getIndex()?.array as ArrayLike<number>)
  geometry.dispose()
  const vertexCount = positions.length / 3
  const legOfVertex: number[] = []
  for (let i = 0; i < vertexCount; i++) {
    legOfVertex.push(nearestLeg(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]))
  }
  return { positions, indices, legOfVertex, vertexCount }
}

/** Triangles whose three vertices all belong to `leg` and all lie below
 *  `ceilingY` — the foot slab, with the tibia's long side faces excluded
 *  because they reach up to the knee. */
export function trianglesUnder(mesh: GearMesh, leg: number, ceilingY: number): number[][] {
  const out: number[][] = []
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const v = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]]
    if (v.some((k) => mesh.legOfVertex[k] !== leg)) continue
    if (v.some((k) => mesh.positions[k * 3 + 1] > ceilingY)) continue
    out.push(v)
  }
  return out
}

/** True when (x, z) lies inside the triangle's plan-view projection. */
export function coversInPlan(
  mesh: GearMesh, tri: readonly number[], x: number, z: number,
): boolean {
  const px = tri.map((k) => mesh.positions[k * 3])
  const pz = tri.map((k) => mesh.positions[k * 3 + 2])
  const side = (i: number, j: number): number =>
    (px[j] - px[i]) * (z - pz[i]) - (pz[j] - pz[i]) * (x - px[i])
  const a = side(0, 1)
  const b = side(1, 2)
  const c = side(2, 0)
  return (a >= 0 && b >= 0 && c >= 0) || (a <= 0 && b <= 0 && c <= 0)
}

/** The vertices those triangles use — the foot as a solid, without the tibia's
 *  long side faces dragging the knee into the sample. */
export function verticesOf(mesh: GearMesh, triangles: readonly number[][]):
[number, number, number][] {
  const seen = new Set<number>()
  const out: [number, number, number][] = []
  for (const tri of triangles) {
    for (const k of tri) {
      if (seen.has(k)) continue
      seen.add(k)
      out.push([mesh.positions[k * 3], mesh.positions[k * 3 + 1], mesh.positions[k * 3 + 2]])
    }
  }
  return out
}

/** Vertices of one leg, as [x, y, z] triples. */
export function legVertices(mesh: GearMesh, leg: number): [number, number, number][] {
  const out: [number, number, number][] = []
  for (let i = 0; i < mesh.vertexCount; i++) {
    if (mesh.legOfVertex[i] !== leg) continue
    out.push([mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]])
  }
  return out
}
