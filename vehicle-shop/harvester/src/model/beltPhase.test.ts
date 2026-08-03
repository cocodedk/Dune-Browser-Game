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
  BOTTOM_RUN_Y, TOP_RUN_Y, WRAP_RADIUS, WRAP_ARC, STRAIGHT_SPAN,
  LOOP_LENGTH, LINK_PITCH, LINK_LENGTH, LINK_COUNT, LINK_GAP,
  TANGENT_FRONT, TANGENT_REAR,
  advanceBeltPhase, linkLoopPosition, placeAlongLoop, isOnWrap,
} from './beltPhase'

const S = TRACK.beltLinks.straightPerRun
const W = TRACK.beltLinks.wrapPerSprocket

/** Every link's placement at a given phase. */
function chain(phase: number) {
  return Array.from({ length: LINK_COUNT }, (_, i) => placeAlongLoop(linkLoopPosition(i, phase)))
}

describe('belt phase — density and geometry from spec', () => {
  it('derives ONE pitch from the spec counts, not from local magic numbers', () => {
    expect(S).toBe(29)
    expect(W).toBe(8)
    // The chain's length IS the spec's total, and the pitch is the loop over
    // that total — so changing spec moves the density and nothing else does.
    expect(LINK_COUNT).toBe(2 * S + 2 * W)
    expect(LINK_COUNT).toBe(74)
    expect(LOOP_LENGTH / LINK_PITCH).toBeCloseTo(LINK_COUNT, 9)
    // One link geometry everywhere: each segment holds its spec count to
    // within a fraction of a link, at the SAME pitch.
    expect(STRAIGHT_SPAN / LINK_PITCH).toBeCloseTo(S, 0)
    expect(WRAP_ARC / LINK_PITCH).toBeCloseTo(W, 0)
    expect(LINK_LENGTH).toBeCloseTo(LINK_PITCH - LINK_GAP, 9)
  })

  it('puts the bottom run ON the ground and wraps the sprocket from outside', () => {
    const thickness = TRACK.sprocketY - TRACK.sprocketRadius
    expect(BOTTOM_RUN_Y).toBeCloseTo(thickness / 2, 9)
    // No step in y at the tangent, and the belt's inner face lands on the rim.
    expect(TRACK.sprocketY - WRAP_RADIUS).toBeCloseTo(BOTTOM_RUN_Y, 9)
    expect(WRAP_RADIUS - thickness / 2).toBeCloseTo(TRACK.sprocketRadius, 9)
    expect(TOP_RUN_Y).toBeCloseTo(TRACK.sprocketY + WRAP_RADIUS, 9)
  })

  it('hands nothing over at the tangents — the path is continuous there', () => {
    // The pass-1 fix for the tangent gap was an overlap. With one pitch the
    // links FLOW through instead, so the assertion is stronger: position and
    // heading agree across every segment boundary, including the loop seam.
    const e = 1e-6
    for (const boundary of [STRAIGHT_SPAN, STRAIGHT_SPAN + WRAP_ARC, 2 * STRAIGHT_SPAN + WRAP_ARC, LOOP_LENGTH]) {
      const before = placeAlongLoop(boundary - e)
      const after = placeAlongLoop((boundary + e) % LOOP_LENGTH)
      expect(after.y).toBeCloseTo(before.y, 5)
      expect(after.z).toBeCloseTo(before.z, 5)
      // Headings compared as direction vectors, so -PI and +PI agree.
      expect(Math.sin(after.rotX)).toBeCloseTo(Math.sin(before.rotX), 5)
      expect(Math.cos(after.rotX)).toBeCloseTo(Math.cos(before.rotX), 5)
    }
  })

  it('keeps every neighbour exactly one pitch apart, tangents included', () => {
    // No hole anywhere in the chain: walking the loop, consecutive links are
    // always LINK_PITCH of arc apart and never further.
    for (const phase of [0, 0.37, 5.1, 40.9, 52.3, 99.8]) {
      const us = Array.from({ length: LINK_COUNT }, (_, i) => linkLoopPosition(i, phase)).sort((a, b) => a - b)
      for (let i = 1; i < LINK_COUNT; i++) {
        expect(us[i] - us[i - 1]).toBeCloseTo(LINK_PITCH, 6)
      }
      // And the pair that straddles u = 0 closes the loop to the same pitch.
      expect(LOOP_LENGTH - us[LINK_COUNT - 1] + us[0]).toBeCloseTo(LINK_PITCH, 6)
    }
  })
})

describe('belt phase — the scroll', () => {
  it('advances by speed x dt and stays bounded', () => {
    expect(advanceBeltPhase(0, 0.6, 0.5)).toBeCloseTo(0.3, 12)
    let p = 0
    for (let i = 0; i < 500; i++) p = advanceBeltPhase(p, 1.7, 0.25)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThan(LOOP_LENGTH)
  })

  it('returns to the same configuration after one whole lap', () => {
    const before = chain(0)
    const after = chain(advanceBeltPhase(0, LOOP_LENGTH, 1))
    for (let i = 0; i < LINK_COUNT; i++) {
      expect(after[i].z).toBeCloseTo(before[i].z, 6)
      expect(after[i].y).toBeCloseTo(before[i].y, 6)
    }
  })

  it('BOTTOM RUN travels toward +Z at forward drive — the sign trap', () => {
    const a = placeAlongLoop(linkLoopPosition(3, 0))
    const b = placeAlongLoop(linkLoopPosition(3, advanceBeltPhase(0, 0.6, 0.5)))
    expect(a.y).toBeCloseTo(BOTTOM_RUN_Y, 9)
    expect(b.z - a.z).toBeCloseTo(0.3, 9)
    expect(b.z).toBeGreaterThan(a.z)
  })

  it('TOP RUN travels toward -Z at forward drive, by the same distance', () => {
    // Link 40 sits on the top run at zero phase (29 links reach the rear
    // tangent, 8 more cross the wrap).
    const a = placeAlongLoop(linkLoopPosition(40, 0))
    const b = placeAlongLoop(linkLoopPosition(40, advanceBeltPhase(0, 0.6, 0.5)))
    expect(a.y).toBeCloseTo(TOP_RUN_Y, 9)
    expect(b.z - a.z).toBeCloseTo(-0.3, 9)
  })

  it('mirrors under reverse drive', () => {
    const p = advanceBeltPhase(0, 5, 1)
    const q = advanceBeltPhase(p, -0.6, 0.5)
    expect(placeAlongLoop(linkLoopPosition(3, q)).z - placeAlongLoop(linkLoopPosition(3, p)).z).toBeCloseTo(-0.3, 9)
    expect(placeAlongLoop(linkLoopPosition(40, q)).z - placeAlongLoop(linkLoopPosition(40, p)).z).toBeCloseTo(0.3, 9)
  })
})

describe('belt phase — the wraps', () => {
  it('curves around the OUTSIDE of each sprocket at every phase (round-16 bug)', () => {
    for (const phase of [0, 0.4, 3.1, 9.7, 41.2, 63.5]) {
      for (let i = 0; i < LINK_COUNT; i++) {
        const u = linkLoopPosition(i, phase)
        if (!isOnWrap(u)) continue
        const at = placeAlongLoop(u)
        // Nothing curves back between the sprockets: the belly points at the
        // nose up front and at the tail aft.
        expect(at.z <= TANGENT_FRONT + 1e-9 || at.z >= TANGENT_REAR - 1e-9).toBe(true)
        expect(at.y).toBeGreaterThanOrEqual(BOTTOM_RUN_Y - 1e-9)
        expect(at.y).toBeLessThanOrEqual(TOP_RUN_Y + 1e-9)
      }
    }
  })

  it('orbits at speed/radius — the rate that keeps the sprocket meshed', () => {
    // A link mid-way round the rear wrap, stepped by 0.3m of belt travel.
    const u = STRAIGHT_SPAN + WRAP_ARC / 2
    const a = placeAlongLoop(u)
    const b = placeAlongLoop(u + 0.3)
    const angleA = Math.atan2(a.y - TRACK.sprocketY, a.z - TANGENT_REAR)
    const angleB = Math.atan2(b.y - TRACK.sprocketY, b.z - TANGENT_REAR)
    expect(angleB - angleA).toBeCloseTo(0.3 / WRAP_RADIUS, 9)
    expect(b.y).toBeGreaterThan(a.y) // the rear wrap carries links UP
    // The front wrap brings them back DOWN.
    const f = 2 * STRAIGHT_SPAN + WRAP_ARC + WRAP_ARC / 2
    expect(placeAlongLoop(f + 0.3).y).toBeLessThan(placeAlongLoop(f).y)
  })

  it('points every link along the belt path — the link axis IS the tangent', () => {
    const step = 1e-5
    for (let u = 0; u < LOOP_LENGTH; u += 0.37) {
      const at = placeAlongLoop(u)
      const next = placeAlongLoop((u + step) % LOOP_LENGTH)
      const dy = (next.y - at.y) / step
      const dz = (next.z - at.z) / step
      expect(-Math.sin(at.rotX)).toBeCloseTo(dy, 3)
      expect(Math.cos(at.rotX)).toBeCloseTo(dz, 3)
    }
  })

  it('meets each tangent point exactly, with no step in the belt line', () => {
    expect(placeAlongLoop(0).y).toBeCloseTo(BOTTOM_RUN_Y, 9)
    expect(placeAlongLoop(0).z).toBeCloseTo(TANGENT_FRONT, 9)
    expect(placeAlongLoop(STRAIGHT_SPAN).z).toBeCloseTo(TANGENT_REAR, 9)
    expect(placeAlongLoop(STRAIGHT_SPAN).y).toBeCloseTo(BOTTOM_RUN_Y, 9)
    expect(placeAlongLoop(STRAIGHT_SPAN + WRAP_ARC).y).toBeCloseTo(TOP_RUN_Y, 9)
    expect(placeAlongLoop(STRAIGHT_SPAN + WRAP_ARC).z).toBeCloseTo(TANGENT_REAR, 9)
    expect(placeAlongLoop(2 * STRAIGHT_SPAN + WRAP_ARC).z).toBeCloseTo(TANGENT_FRONT, 9)
  })
})
