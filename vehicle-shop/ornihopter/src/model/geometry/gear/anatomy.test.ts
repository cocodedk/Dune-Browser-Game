// vehicle-shop/ornihopter/src/model/geometry/gear/anatomy.test.ts
// The kit's PARTS LANGUAGE, asserted against the built mesh.
//
// stance.test.ts settled WHERE the legs stand and gearMesh.test.ts settles how
// they are wound. Neither noticed that the legs had no mechanism in them at
// all: a plain boss, two parallel rails and a spade, where the kit measures a
// castellated locking loop, a two-bar scissor and a slotted skid
// (docs/profiles/kit-dossier.md §a). A silhouette test cannot catch that, so
// these read the actual buffer.
//
// Each case records what it measured against the round-6c gear, so a later
// reader can tell a bar that was won from a bar that was always green.

import { describe, it, expect } from 'vitest'
import { GEAR_LEGS } from './stance'
import { HIP_BRACKET, bracketFrame } from './hipBracket'
import { legVertices, readGearMesh } from './meshProbe'
import { skinDistanceAt } from './hipSeat'
import { hullHalfWidthAt, hullHalfHeightAt, hullKeelYAt } from '../hullProfile'
import { hullShapeAt } from '../hullStations'
import { buildRing, outwardDistance } from '../hullCrossSection'

const mesh = readGearMesh()

/** Split a sorted list wherever it jumps by more than `gap`. */
function runs(values: number[], gap: number): number[][] {
  const sorted = [...values].sort((a, b) => a - b)
  const out: number[][] = []
  for (const value of sorted) {
    const last = out[out.length - 1]
    if (!last || value - last[last.length - 1] > gap) out.push([value])
    else last.push(value)
  }
  return out
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Height of the section's widest line — the wings' arc starts here. */
function chineYAt(z: number): number {
  const ring = buildRing(hullHalfWidthAt(z), hullHalfHeightAt(z), hullShapeAt(z), 0, hullKeelYAt(z))
  return ring.reduce((widest, p) => (Math.abs(p.x) > Math.abs(widest.x) ? p : widest)).y
}

describe('every leg reaches the hull twice', () => {
  it('buries two separate anchors per leg, not one', () => {
    // FAIL-FIRST, round-6c gear: one buried cluster per leg (the single hip
    // boss), so this read `expected 1 to be 2` on all six. A brace strut that
    // stops at the main strut is a decoration; one that reaches its own patch
    // of hull is a load path, and it is the load path that makes a leg read as
    // one triangulated object instead of two loose sticks.
    for (let i = 0; i < GEAR_LEGS.length; i++) {
      const buried = legVertices(mesh, i)
        .filter(([x, y, z]) => skinDistanceAt(x, y, z) < -0.02)
      expect(buried.length).toBeGreaterThan(4)
      const clusters = runs(buried.map(([, , z]) => z), 0.35)
      expect(clusters.length).toBe(2)
      expect(Math.abs(mean(clusters[0]) - mean(clusters[1]))).toBeGreaterThan(0.5)
    }
  })
})

describe('the hip bracket is a castellated locking loop', () => {
  it('stands four crenels proud of the loop rim on every leg', () => {
    // FAIL-FIRST, round-6c gear: `expected 2 to be 4`. The old hip boss was
    // half a metre across, so it did stand proud of where the rim now is — but
    // as ONE unbroken lobe per side, which is exactly the difference between a
    // fairing and a toothed collar.
    //
    // The FRAME comes from hipBracket.ts (it is an input, shared with the
    // builder by design); the COUNT comes from the buffer. Setting
    // HIP_BRACKET.crenelProud to 0 leaves the frame identical and drops this
    // to 0 — verified by injection, so the count is measuring the mesh.
    //
    // GAP: one tooth is 2 x crenelHalfLong = 0.28m of u, and the teeth sit
    // 0.72m apart, so the run-splitting gap has to fall between those. 0.35
    // merges a tooth's own near and far faces and still separates two teeth.
    const rim = HIP_BRACKET.halfWidth + HIP_BRACKET.railHalfBreadth + 0.02
    for (let i = 0; i < GEAR_LEGS.length; i++) {
      const f = bracketFrame(GEAR_LEGS[i])
      const project = (p: readonly number[]): [number, number, number] => {
        const d = [p[0] - f.origin[0], p[1] - f.origin[1], p[2] - f.origin[2]]
        const dot = (b: readonly number[]): number => d[0] * b[0] + d[1] * b[1] + d[2] * b[2]
        return [dot(f.u), dot(f.v), dot(f.n)]
      }
      const inSlab = legVertices(mesh, i).map(project).filter(
        ([du, , dn]) =>
          Math.abs(dn) <= HIP_BRACKET.railHalfThick + 0.02 &&
          Math.abs(du) <= f.halfLength + 0.05,
      )
      let lobes = 0
      for (const sign of [1, -1]) {
        const proud = inSlab.filter(([, dv]) => sign * dv > rim).map(([du]) => du)
        lobes += runs(proud, 0.35).length
      }
      expect(lobes).toBe(HIP_BRACKET.crenels)
    }
  })

  it('keeps the whole bracket outside the skin it bolts to', () => {
    // A collar half-swallowed by its own hull is the "attached where there is
    // little hull" defect in a new costume. Sampled ALONG the rails, not just
    // at the four corners: the loop is a straight chord across a flank that
    // curves, so if it dips inside anywhere it dips in the middle. GREEN
    // against the old gear too (it had no bracket) — recorded as a bar this
    // round could have broken, not one it fixed.
    for (let i = 0; i < GEAR_LEGS.length; i++) {
      const f = bracketFrame(GEAR_LEGS[i])
      for (let s = 0; s <= 12; s++) {
        const along = (s / 6 - 1) * f.halfLength
        for (const across of [-1, 1]) {
          const p = [0, 1, 2].map((k) =>
            f.origin[k] + f.u[k] * along + across * f.v[k] * HIP_BRACKET.halfWidth)
          expect(skinDistanceAt(p[0], p[1], p[2])).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('the gear stays out of the wings arc', () => {
  it('holds every gear vertex below the chine at its own station', () => {
    // stance.test.ts asserts this of the eight NAMED points. The mesh is what
    // the wings can actually hit, and round 6d put a 0.70m-tall bracket on the
    // flank at the rear station, where the hip seat has only 0.527m of room
    // under the chine. GREEN against the old gear, whose tallest object at the
    // hip was a 0.5m half-breadth boss.
    let worst = Infinity
    for (let i = 0; i < mesh.vertexCount; i++) {
      const y = mesh.positions[i * 3 + 1]
      const z = mesh.positions[i * 3 + 2]
      worst = Math.min(worst, chineYAt(z) - y)
    }
    expect(worst).toBeGreaterThan(0.05)
  })
})

/** Kept honest: the ring helper above must agree with hipSeat.ts's own idea of
 *  the skin, or every distance in this file is measured against a fiction. */
describe('the probe agrees with the builder about where the hull is', () => {
  it('matches skinDistanceAt on a hip seat', () => {
    for (const leg of GEAR_LEGS) {
      const ring = buildRing(
        hullHalfWidthAt(leg.hipSkin.z), hullHalfHeightAt(leg.hipSkin.z),
        hullShapeAt(leg.hipSkin.z), 0, hullKeelYAt(leg.hipSkin.z),
      )
      expect(outwardDistance(leg.hipSkin.x, leg.hipSkin.y, ring))
        .toBeCloseTo(skinDistanceAt(leg.hipSkin.x, leg.hipSkin.y, leg.hipSkin.z), 9)
    }
  })
})
