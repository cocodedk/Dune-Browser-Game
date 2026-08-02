// vehicle-shop/harvester/src/model/beltPhase.test.ts
// The belt's SCROLL maths, pinned. These are pure-function tests — no
// three.js, no DOM, no canvas — which is the whole reason the phase maths
// lives in its own module instead of inside the builder.
//
// The sign trap this file exists to pin: the machine drives FORWARD toward
// its cutter at -Z, so a track's ground run is stationary against the sand
// and therefore, RELATIVE TO THE HULL, the bottom run must travel toward +Z
// (rearward) at positive track speed. Get that backwards and the machine
// moonwalks — the ornithopter shop lost four rounds to exactly this.

import { describe, it, expect } from 'vitest'
import { TRACK } from '../spec'
import {
  BOTTOM_RUN_Y, TOP_RUN_Y, WRAP_RADIUS, WRAP_ARC, WRAP_PITCH,
  RUN_SPAN, RUN_SPAN_START, RUN_SPAN_END, STRAIGHT_PITCH,
  zeroBeltPhase, advanceBeltPhase, bottomRunZ, topRunZ, wrapPlacement,
} from './beltPhase'

const S = TRACK.beltLinks.straightPerRun
const W = TRACK.beltLinks.wrapPerSprocket
const FRONT = TRACK.sprocketZ[0]
const REAR = TRACK.sprocketZ[1]

describe('belt phase — density and geometry from spec', () => {
  it('derives its pitches from spec counts, not from local magic numbers', () => {
    expect(S).toBe(29)
    expect(W).toBe(15)
    expect(RUN_SPAN / STRAIGHT_PITCH).toBeCloseTo(S, 9)
    expect(WRAP_ARC / WRAP_PITCH).toBeCloseTo(W, 9)
    expect(WRAP_ARC).toBeCloseTo(Math.PI * WRAP_RADIUS, 9)
    // Art-director numbers: ~1.41m straight pitch, ~0.76m wrap pitch.
    expect(STRAIGHT_PITCH).toBeGreaterThan(1.3)
    expect(STRAIGHT_PITCH).toBeLessThan(1.5)
    expect(WRAP_PITCH).toBeLessThan(0.85)
  })

  it('puts the bottom run ON the ground and wraps the sprocket from outside', () => {
    // Link centre at half a link-thickness, so the plate's underside is y=0.
    const thickness = TRACK.sprocketY - TRACK.sprocketRadius
    expect(BOTTOM_RUN_Y).toBeCloseTo(thickness / 2, 9)
    // The wrap radius is exactly what carries the run's centreline around the
    // sprocket: no step in y at the tangent, and the belt's inner face lands
    // on the sprocket rim.
    expect(TRACK.sprocketY - WRAP_RADIUS).toBeCloseTo(BOTTOM_RUN_Y, 9)
    expect(WRAP_RADIUS - thickness / 2).toBeCloseTo(TRACK.sprocketRadius, 9)
    expect(TOP_RUN_Y).toBeCloseTo(TRACK.sprocketY + WRAP_RADIUS, 9)
  })

  it('overlaps the straight runs into the wrap arcs — the transition gap fix', () => {
    expect(RUN_SPAN_START).toBeLessThan(FRONT)
    expect(RUN_SPAN_END).toBeGreaterThan(REAR)
    // The overlap is small enough that the straight link still sits on the
    // curve: the arc has barely risen this far past the tangent.
    const over = FRONT - RUN_SPAN_START
    const rise = WRAP_RADIUS - Math.sqrt(WRAP_RADIUS * WRAP_RADIUS - over * over)
    expect(rise).toBeLessThan(0.05)
    expect(over).toBeGreaterThan(0.2)
  })
})

describe('belt phase — the scroll', () => {
  it('advances by speed x dt and stays bounded in every segment', () => {
    let p = zeroBeltPhase()
    p = advanceBeltPhase(p, 0.6, 0.5)
    expect(p.run).toBeCloseTo(0.3, 12)
    expect(p.wrap).toBeCloseTo(0.3, 12)
    // Many steps: still wrapped into range, never drifting off to infinity.
    for (let i = 0; i < 500; i++) p = advanceBeltPhase(p, 1.7, 0.25)
    expect(p.run).toBeGreaterThanOrEqual(0)
    expect(p.run).toBeLessThan(RUN_SPAN)
    expect(p.wrap).toBeGreaterThanOrEqual(0)
    expect(p.wrap).toBeLessThan(WRAP_ARC)
  })

  it('returns to the same configuration after one whole span of travel', () => {
    const before = Array.from({ length: S }, (_, i) => bottomRunZ(i, zeroBeltPhase()))
    const after = Array.from({ length: S }, (_, i) => bottomRunZ(i, advanceBeltPhase(zeroBeltPhase(), RUN_SPAN, 1)))
    for (let i = 0; i < S; i++) expect(after[i]).toBeCloseTo(before[i], 9)
  })

  it('BOTTOM RUN travels toward +Z at forward drive — the sign trap', () => {
    const a = zeroBeltPhase()
    const b = advanceBeltPhase(a, 0.6, 0.5)
    const z0 = bottomRunZ(3, a)
    const z1 = bottomRunZ(3, b)
    expect(z1 - z0).toBeCloseTo(0.3, 9)
    expect(z1).toBeGreaterThan(z0)
  })

  it('TOP RUN travels toward -Z at forward drive, by the same distance', () => {
    const a = zeroBeltPhase()
    const b = advanceBeltPhase(a, 0.6, 0.5)
    expect(topRunZ(3, b) - topRunZ(3, a)).toBeCloseTo(-0.3, 9)
  })

  it('mirrors under reverse drive', () => {
    const a = advanceBeltPhase(zeroBeltPhase(), 5, 1)
    const b = advanceBeltPhase(a, -0.6, 0.5)
    expect(bottomRunZ(3, b) - bottomRunZ(3, a)).toBeCloseTo(-0.3, 9)
    expect(topRunZ(3, b) - topRunZ(3, a)).toBeCloseTo(0.3, 9)
  })

  it('keeps the runs inside their span and evenly pitched at any phase', () => {
    const p = advanceBeltPhase(zeroBeltPhase(), 7.31, 1)
    const zs = Array.from({ length: S }, (_, i) => bottomRunZ(i, p)).sort((m, n) => m - n)
    expect(zs[0]).toBeGreaterThanOrEqual(RUN_SPAN_START)
    expect(zs[S - 1]).toBeLessThanOrEqual(RUN_SPAN_END)
    for (let i = 1; i < S; i++) expect(zs[i] - zs[i - 1]).toBeCloseTo(STRAIGHT_PITCH, 9)
  })
})

describe('belt phase — the wraps', () => {
  it('curves around the OUTSIDE of each sprocket at every phase (round-16 bug)', () => {
    for (const travel of [0, 0.4, 3.1, 9.7, 11.4]) {
      const p = advanceBeltPhase(zeroBeltPhase(), travel, 1)
      for (let i = 0; i < W; i++) {
        expect(wrapPlacement(i, p, FRONT, -1).z).toBeLessThanOrEqual(FRONT + 1e-9)
        expect(wrapPlacement(i, p, REAR, 1).z).toBeGreaterThanOrEqual(REAR - 1e-9)
        for (const zSign of [1, -1] as const) {
          const at = wrapPlacement(i, p, zSign === 1 ? REAR : FRONT, zSign)
          expect(at.y).toBeGreaterThanOrEqual(BOTTOM_RUN_Y - 1e-9)
          expect(at.y).toBeLessThanOrEqual(TOP_RUN_Y + 1e-9)
        }
      }
    }
  })

  it('orbits at speed/radius, rear climbing and front descending at forward drive', () => {
    const a = advanceBeltPhase(zeroBeltPhase(), 2, 1)
    const b = advanceBeltPhase(a, 0.6, 0.5)
    const rearA = wrapPlacement(0, a, REAR, 1)
    const rearB = wrapPlacement(0, b, REAR, 1)
    const frontA = wrapPlacement(0, a, FRONT, -1)
    const frontB = wrapPlacement(0, b, FRONT, -1)
    // Arc travelled is speed x dt, so the angular rate is speed / radius —
    // the same rate the sprocket itself turns, which is what keeps the
    // engagement lugs locked to the teeth.
    expect(rearB.angle - rearA.angle).toBeCloseTo(0.3 / WRAP_RADIUS, 9)
    expect(frontB.angle - frontA.angle).toBeCloseTo(-0.3 / WRAP_RADIUS, 9)
    expect(rearB.y).toBeGreaterThan(rearA.y)   // rear wrap carries links UP
    expect(frontB.y).toBeLessThan(frontA.y)    // front wrap brings them DOWN
  })

  it('points every wrap link along the belt path — the link axis IS the tangent', () => {
    const p = advanceBeltPhase(zeroBeltPhase(), 1.9, 1)
    const step = 1e-5
    const q = advanceBeltPhase(p, step, 1)
    for (const [sz, zSign] of [[REAR, 1], [FRONT, -1]] as const) {
      for (let i = 0; i < W; i++) {
        const at = wrapPlacement(i, p, sz, zSign)
        const next = wrapPlacement(i, q, sz, zSign)
        if (Math.abs(next.angle - at.angle) > 0.5) continue // the link that wrapped
        const dy = (next.y - at.y) / step
        const dz = (next.z - at.z) / step
        // A box's long axis is local +Z; rotation.x = t maps it to (-sin t, cos t).
        expect(-Math.sin(at.rotX)).toBeCloseTo(dy, 3)
        expect(Math.cos(at.rotX)).toBeCloseTo(dz, 3)
      }
    }
  })

  it('hands off at the tangents with no step in the belt line', () => {
    const p = zeroBeltPhase()
    // Wrap link 0 at zero phase sits exactly on a tangent point: the rear one
    // at the bottom run's height, the front one at the top run's.
    expect(wrapPlacement(0, p, REAR, 1).y).toBeCloseTo(BOTTOM_RUN_Y, 9)
    expect(wrapPlacement(0, p, REAR, 1).z).toBeCloseTo(REAR, 9)
    expect(wrapPlacement(0, p, FRONT, -1).y).toBeCloseTo(TOP_RUN_Y, 9)
    expect(wrapPlacement(0, p, FRONT, -1).z).toBeCloseTo(FRONT, 9)
  })
})
