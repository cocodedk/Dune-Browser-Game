// vehicle-shop/ornihopter/src/interior/layout.test.ts
// Pure numeric checks on the derived layout — no three.js, no DOM. These
// encode the correctness bar's plain-language requirements as arithmetic so
// a future edit to layout.ts (or an upstream edit to spec.ts) cannot quietly
// break them.

import { describe, it, expect } from 'vitest'
import { COCKPIT, PILOT_EYE } from '../spec'
import { EYE, PAN_Y, SEAT, CONSOLE, WALL, seatX, NOSE_Z, CABIN_BOUNDARY_Z, FLOOR_FRONT_Z, FLOOR_REAR_Z } from './layout'
import { hullInteriorHalfWidthAt } from './hullSection'

describe('EYE / PAN_Y agree with spec.ts', () => {
  it('PAN_Y plus eyeAbovePan reproduces PILOT_EYE.y exactly', () => {
    expect(PAN_Y + COCKPIT.eyeAbovePan).toBeCloseTo(PILOT_EYE.y, 10)
  })

  it('a seated pilot eye sits about 1.65m above the cabin floor', () => {
    expect(EYE.y - COCKPIT.floorY).toBeCloseTo(1.65, 2)
  })

  it('seatX mirrors seatOffsetX and matches PILOT_EYE.x on the pilot side', () => {
    expect(seatX(-1)).toBeCloseTo(PILOT_EYE.x, 10)
    expect(seatX(1)).toBeCloseTo(-PILOT_EYE.x, 10)
    expect(seatX(1)).toBeCloseTo(COCKPIT.seatOffsetX, 10)
  })
})

describe('the pilot cannot see their own seatback (bar Q2)', () => {
  it('the pan\'s rear edge, and so the whole backrest beyond it, sits aft of the eye', () => {
    expect(SEAT.rearZ).toBeGreaterThan(EYE.z)
  })

  it('the backrest top is below the eye, so it cannot occlude the forward view even at the edge', () => {
    expect(SEAT.backTopY).toBeLessThan(EYE.y)
  })
})

describe('the console sits forward of and below the eye (bar Q5, horizon visible)', () => {
  it('the near (pilot-facing) edge is forward of the eye', () => {
    expect(CONSOLE.nearZ).toBeLessThan(EYE.z)
  })

  it('the far edge is forward of the near edge', () => {
    expect(CONSOLE.farZ).toBeLessThan(CONSOLE.nearZ)
  })

  it('the console top sits well below eye height', () => {
    expect(CONSOLE.topY).toBeLessThan(EYE.y)
    expect(EYE.y - CONSOLE.topY).toBeGreaterThan(0.5)
  })

  it('the dash TAPERS with the hull instead of taking one width', () => {
    // Round 6a took hullInteriorHalfWidthAt once, at the box's narrowest
    // corner, and got a 2.17m dash with an empty third and a gap at the sill.
    const near = CONSOLE.halfWidthAt(CONSOLE.nearZ)
    const far = CONSOLE.halfWidthAt(CONSOLE.farZ)
    expect(near).toBeGreaterThan(far)
    expect(near - far).toBeGreaterThan(0.1)
  })

  it('and reaches the side liner at its widest station', () => {
    // Same function the wall's own panels read, so "meets the sill" is one
    // number rather than two that happen to agree.
    const dash = CONSOLE.halfWidthAt(CONSOLE.nearZ)
    const wall = hullInteriorHalfWidthAt(CONSOLE.topY, CONSOLE.nearZ)
    expect(wall - dash).toBeLessThan(0.05)
    expect(dash).toBeGreaterThan(1.2)
  })
})

describe('side walls stay inboard of the clear volume', () => {
  it('WALL.halfX is inset from clearWidth/2, not flush with it', () => {
    expect(WALL.halfX).toBeLessThan(COCKPIT.clearWidth / 2)
    expect(WALL.halfX).toBeGreaterThan(0)
  })
})

describe('longitudinal stations are ordered nose to cabin boundary', () => {
  it('nose, floor front, floor rear and the cabin boundary run in increasing z', () => {
    expect(NOSE_Z).toBeLessThan(FLOOR_FRONT_Z)
    expect(FLOOR_FRONT_Z).toBeLessThan(FLOOR_REAR_Z)
    expect(FLOOR_REAR_Z).toBeLessThanOrEqual(CABIN_BOUNDARY_Z)
  })

  it('the cockpit compartment (BODY.cockpitLength) is long enough to hold the floor', () => {
    expect(CABIN_BOUNDARY_Z - NOSE_Z).toBeGreaterThan(FLOOR_REAR_Z - FLOOR_FRONT_Z)
  })
})
