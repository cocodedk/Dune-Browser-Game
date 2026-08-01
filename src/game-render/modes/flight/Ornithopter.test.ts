// src/game-render/modes/flight/Ornithopter.test.ts
// The hinge invariant — stage 22 section 1.1 and build Step 1. `Mesh` and
// `Vector3` are plain three.js math objects with no WebGL dependency (see
// shadowRig.test.ts and planetField.test.ts for the same pattern already
// used in this repo), so building the real craft here needs no GL context.

import { describe, it, expect } from 'vitest'
import { Mesh, Vector3 } from 'three'
import { createOrnithopter, HULL_MAX_RADIUS } from './Ornithopter'
import { BEAT_HZ } from './wingConfig'

function wingMeshes(craft: ReturnType<typeof createOrnithopter>): Mesh[] {
  const found: Mesh[] = []
  craft.group.traverse((object) => {
    if (object instanceof Mesh && object.name === 'wing') found.push(object)
  })
  return found
}

/**
 * Indices of the vertex/vertices AT the wing's root — the point on the
 * span axis where the wing meets the fuselage, which is what section 1.1
 * measured as "root" (a single point, not the whole root cross-section:
 * that ring is the wing's own chord, up to 5.5 units wide, and is wider
 * than the hull by design — spar and membrane are a separate work stream).
 * WingRig.ts translates each wing's geometry so this point sits at local
 * (0,0,0), so it is found here as the vertex/vertices nearest that origin,
 * robust regardless of span, taper, or which side the wing is on.
 */
function rootVertexIndices(mesh: Mesh): number[] {
  const position = mesh.geometry.attributes.position
  let minAbsX = Infinity
  for (let i = 0; i < position.count; i++) minAbsX = Math.min(minAbsX, Math.abs(position.getX(i)))

  let minRadiusSq = Infinity
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(position.getX(i)) - minAbsX > 1e-6) continue
    const y = position.getY(i)
    const z = position.getZ(i)
    minRadiusSq = Math.min(minRadiusSq, y * y + z * z)
  }

  const indices: number[] = []
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(position.getX(i)) - minAbsX > 1e-6) continue
    const y = position.getY(i)
    const z = position.getZ(i)
    if (y * y + z * z - minRadiusSq < 1e-6) indices.push(i)
  }
  return indices
}

describe('the wing root hinge (stage 22 section 1.1, build Step 1)', () => {
  it('builds four named, hinged wings', () => {
    const craft = createOrnithopter()
    expect(wingMeshes(craft).length).toBe(4)
    craft.dispose()
  })

  it('keeps every wing root vertex within the fuselage radius across a full beat cycle', () => {
    // This is the test the stage document asks for: it must fail against
    // the code it replaces (see the contrast test below, which reproduces
    // that formula directly) and pass here.
    //
    // Measured relative to the wing's pivot PARENT (driftNode, the
    // fuselage's own frame) rather than absolute world space: the craft's
    // slow attitude drift (section 2.3) and, in the real flight cinematic,
    // its heading and bank, legitimately move the whole aircraft through
    // world space — that is not a hinge failure. The hinge is a property
    // of the wing's relationship to the hull, not the hull's to the world.
    const craft = createOrnithopter()
    const meshes = wingMeshes(craft)
    expect(meshes.length).toBe(4)

    const periodMs = 1000 / BEAT_HZ
    let maxRadiusFromHullAxis = 0
    let maxExcursionFromRest = 0

    for (const mesh of meshes) {
      const pivot = mesh.parent! // WingRig's shoulder pivot; mesh itself never translates or rotates
      pivot.updateMatrix() // Object3D.matrix starts as identity until synced at least once
      const indices = rootVertexIndices(mesh)
      const position = mesh.geometry.attributes.position
      const restRelative = indices.map((i) => (
        new Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(pivot.matrix)
      ))

      // Three full periods: the invariant must hold everywhere, not just
      // across the single cycle the spec happened to measure.
      for (let step = 0; step <= 180; step++) {
        const elapsedMs = (step / 180) * periodMs * 3
        craft.update(elapsedMs)
        pivot.updateMatrix()

        indices.forEach((i, n) => {
          const relative = new Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(pivot.matrix)
          const radius = Math.sqrt(relative.x * relative.x + relative.y * relative.y)
          maxRadiusFromHullAxis = Math.max(maxRadiusFromHullAxis, radius)
          maxExcursionFromRest = Math.max(maxExcursionFromRest, relative.distanceTo(restRelative[n]))
        })
      }
    }

    // Section 1.1 measured a +-5.67 unit excursion against a 2.6 unit hull
    // radius — more than double it. The fixed hinge should not even come
    // close: the root is the rotation origin, so it should barely move at
    // all, well inside the hull.
    expect(maxRadiusFromHullAxis).toBeLessThanOrEqual(HULL_MAX_RADIUS + 1e-6)
    expect(maxExcursionFromRest).toBeLessThan(0.5)
    craft.dispose()
  })

  it('both wings of a pair move the same vertical direction, not opposite (a mirrored-sign bug check)', () => {
    const craft = createOrnithopter()
    const [a, b] = wingMeshes(craft)
    craft.update(1000 / BEAT_HZ / 4) // quarter beat: near peak flap
    craft.group.updateMatrixWorld(true)
    const tipA = a.localToWorld(farthestLocalVertex(a))
    const tipB = b.localToWorld(farthestLocalVertex(b))
    const restY = 2.6 // both fore wings mount at the same height at rest
    expect(Math.sign(tipA.y - restY)).toBe(Math.sign(tipB.y - restY))
    craft.dispose()
  })
})

function farthestLocalVertex(mesh: Mesh): Vector3 {
  const position = mesh.geometry.attributes.position
  let best = 0
  let bestAbsX = 0
  for (let i = 0; i < position.count; i++) {
    const absX = Math.abs(position.getX(i))
    if (absX > bestAbsX) {
      bestAbsX = absX
      best = i
    }
  }
  return new Vector3(position.getX(best), position.getY(best), position.getZ(best))
}

describe('triangle budget (stage 22 section 2.5 / acceptance criterion 4)', () => {
  it('stays at or under the ~10,000 triangle budget', () => {
    const craft = createOrnithopter()
    let triangles = 0
    let meshCount = 0
    craft.group.traverse((object) => {
      if (!(object instanceof Mesh)) return
      meshCount++
      const geometry = object.geometry
      const index = geometry.getIndex()
      triangles += index ? index.count / 3 : geometry.attributes.position.count / 3
    })
    // Deliberate: the actual count is reporting data this stage's spec asks
    // to be measured, not just asserted against a threshold.
    console.log(`ornithopter: ${meshCount} meshes, ${triangles} triangles`)
    expect(triangles).toBeLessThanOrEqual(10_000)
    expect(triangles).toBeGreaterThan(296) // the primitive-built craft this replaces
    craft.dispose()
  })
})

describe('for contrast: the see-saw pivot this replaces (section 1.1)', () => {
  it('rotating about midspan sends the root +-5.67 units past a 2.6 unit hull', () => {
    // Reproduces the formula this stage replaces: leftWing.rotation.z =
    // beat * 0.34, with the mesh positioned at its own midspan (-17, 2.6)
    // rather than at the fuselage. Confirms the numbers this stage's
    // measurements are built on, and that the methodology above is
    // discriminating — this would fail the bound it asserts.
    const meshOriginY = 2.6
    const rootLocalX = 17 // the wing's root end, in the old midspan-centred geometry

    let maxExcursion = 0
    for (let i = 0; i <= 100; i++) {
      const beat = Math.sin((i / 100) * Math.PI * 2)
      const rotationZ = beat * 0.34
      const worldY = meshOriginY + rootLocalX * Math.sin(rotationZ)
      maxExcursion = Math.max(maxExcursion, Math.abs(worldY - meshOriginY))
    }

    expect(maxExcursion).toBeCloseTo(5.67, 1)
    expect(maxExcursion).toBeGreaterThan(HULL_MAX_RADIUS * 2)
  })
})
