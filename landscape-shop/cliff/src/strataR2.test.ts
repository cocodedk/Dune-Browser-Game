// landscape-shop/cliff/src/strataR2.test.ts
// R2 GEOLOGY guards: the formation is bedded rock, and the bedding runs at
// each mass's own attitude.
//
// Everything here is measured off the vertex colours the model actually
// builds — never off model/strata.ts's authoring functions — per the house
// rule seam.test.ts sets. The massif is flat-shaded and painted once per
// triangle, so it is read per FACE (testHelpers.paintedSamples's perFace
// mode): reading a 20 m facet at a corner classifies it by a point the
// painter never evaluated.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createCliff } from './model/Cliff'
import { MASSIF_BAKE } from './model/massif'
import { beddingHeightAt, COURSE_M } from './model/strata'
import { paintedSamples, average, binnedVariance, meshesOf, type PaintedSample } from './testHelpers'

/** The masses the two rigs actually read the formation from — the hero, the
 *  four flankers either side of it, and the east tail that R1 left reading
 *  detached. Named rather than derived so the guard cannot quietly shrink to
 *  whatever still passes. */
const PRIMARIES = ['heroButtress', 'eastBastion', 'westBastion', 'midRise', 'northSummit', 'eastTail']

function planeOf(name: string): [number, number, number, number] {
  const mass = MASSIF_BAKE.strata.find((entry) => entry.name === name)
  if (!mass) throw new Error(`${name} is not in the bake's strata table`)
  return mass.plane as [number, number, number, number]
}

function facesOf(massif: PaintedSample[], name: string): PaintedSample[] {
  const mass = MASSIF_BAKE.strata.find((entry) => entry.name === name)
  if (!mass) throw new Error(`${name} is not in the bake's strata table`)
  return massif.slice(mass.from, mass.to).filter((face) => face.nz < -0.2)
}

/** How much colour SCATTER a course still holds when it is cut along one
 *  coordinate. Cut along the mass's own bedding, a course is one colour and
 *  the scatter inside it is only weathering; cut along world height, a bin
 *  mixes rock from different courses and the scatter carries their steps too.
 *  The ratio between the two is therefore "do the bands follow this mass's
 *  attitude", stated as a number.
 *
 *  R2.1 REPLACED the earlier metric, which compared the SPREAD OF BIN MEANS
 *  the two ways. That comparison only discriminated while the bands were
 *  faint: once model/rockRamp.ts's members were amplified to the point a
 *  person can see them through the fog, the member steps dominated both
 *  binnings and every ratio collapsed toward 1.00 — the guard stopped being
 *  able to tell right from wrong, which is worse than a loose threshold.
 *  Within-bin scatter is the sharper question and it separates cleanly:
 *  measured 1.19 to 2.63 across the primaries, mean 1.70. */
function attitudeRatio(rows: PaintedSample[], key: (s: PaintedSample) => number): number {
  return binnedVariance(rows, (s) => s.y, COURSE_M) / binnedVariance(rows, key, COURSE_M)
}

describe('R2: the bake carries one bedding plane per mass, and it covers the rock', () => {
  it('the strata table is contiguous and accounts for every finished triangle', () => {
    expect(MASSIF_BAKE.strata.length).toBe(MASSIF_BAKE.masses)
    let cursor = 0
    for (const mass of MASSIF_BAKE.strata) {
      expect(mass.from).toBe(cursor)
      expect(mass.to).toBeGreaterThan(mass.from)
      cursor = mass.to
    }
    // No triangle may be left without a plane: model/strata.ts would fall
    // back to mass 0 and paint that rock at the wrong attitude in silence.
    expect(cursor).toBe(MASSIF_BAKE.triangles)
  })

  it('every plane is a real stratigraphic height, not a degenerate one', () => {
    for (const mass of MASSIF_BAKE.strata) {
      expect(mass.plane.length).toBe(4)
      for (const value of mass.plane) expect(Number.isFinite(value)).toBe(true)
      // s must still measure roughly upward: the y coefficient stays near 1
      // (compose.mjs's batter lean is the only thing that moves it at all).
      expect(Math.abs(mass.plane[1] - 1)).toBeLessThan(0.1)
    }
  })

  it('the masses really do dip differently — this is not one flat attitude', () => {
    const tilts = PRIMARIES.map((name) => planeOf(name)[0])
    expect(Math.max(...tilts) - Math.min(...tilts)).toBeGreaterThan(0.2)
  })
})

describe('R2: the colour bands follow each mass own bedding, not world height', () => {
  it('a course is one colour along the bedding and a mixture along Y, for every primary', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massif = paintedSamples(root, 'massif', true)

    const ratios = PRIMARIES.map((name) => {
      const plane = planeOf(name)
      const faces = facesOf(massif, name)
      expect(faces.length).toBeGreaterThan(150)
      return attitudeRatio(faces, (s) => beddingHeightAt(plane, s.x, s.y, s.z))
    })

    // Painted off world Y instead of the plane, every ratio collapses to 1.
    // R2.1 measured 1.19 to 2.63 on the built colours, mean 1.70.
    for (const ratio of ratios) expect(ratio).toBeGreaterThan(1.12)
    expect(average(ratios)).toBeGreaterThan(1.5)
    set.dispose()
  })

  it('the prow and the rock it grows out of are the same colour at the join', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const inJoint = (rows: PaintedSample[]): PaintedSample[] => rows.filter((s) => (
      s.nz < -0.2 && Math.abs(s.x) > 82 && Math.abs(s.x) < 118 && s.y > 15 && s.y < 80
    ))
    const rock = inJoint(paintedSamples(root, 'massif', true))
    const prow = inJoint(paintedSamples(root, 'gateWall'))
    expect(rock.length).toBeGreaterThan(100)
    expect(prow.length).toBeGreaterThan(100)

    const rockLuminance = average(rock.map((s) => s.luminance))
    const prowLuminance = average(prow.map((s) => s.luminance))
    // A colour seam down the line where the prow sinks into the rock is the
    // R1.3 "two rock kits meeting" failure in paint. It matters MORE now that
    // the members carry real contrast, and more again now the prow is painted
    // per face against the massif's own per-face rock: measured 9.8% apart,
    // guarded at 15% where R2 carried 18%.
    const gap = Math.abs(rockLuminance - prowLuminance) / ((rockLuminance + prowLuminance) / 2)
    expect(gap).toBeLessThan(0.15)
    set.dispose()
  })
})

describe('R2: every lit surface is painted, and nothing is tinted twice', () => {
  it('each lit mesh carries vertex colours over a white material', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const meshes = meshesOf(root)
    expect(meshes.length).toBeGreaterThan(8)

    let lit = 0
    for (const mesh of meshes) {
      const material = mesh.material as unknown as { type: string; vertexColors: boolean; color: { getHex(): number } }
      const painted = Boolean(mesh.geometry.getAttribute('color'))
      // Unpainted lit rock would render at the material's flat tint, which is
      // the pre-R2 state; a painted mesh whose material kept its tint would
      // render the colour TWICE, since three multiplies the two.
      expect(painted).toBe(true)
      expect(material.vertexColors).toBe(true)
      expect(material.color.getHex()).toBe(0xffffff)
      if (material.type === 'MeshStandardMaterial') lit++
    }
    expect(lit).toBeGreaterThanOrEqual(5)
    set.dispose()
  })
})
