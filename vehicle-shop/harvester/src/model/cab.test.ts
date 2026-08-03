// vehicle-shop/harvester/src/model/cab.test.ts
// Per-component invariant for the cab — split out of the old
// src/components.test.ts (round I0). See hull.test.ts for why the split
// exists, and testSupport.ts for the shared mats()/bounds() helpers.
//
// I4 (immediate-improvements §4, blind-panel finding: "no visible cab or
// windows / no crew space"): CAB.halfWidth widened 3.5 -> 5.5 by the lead;
// this pass adds full-width wrap glass (front + halfway down each side, no
// mullions), a roof rack, and a rear-face boarding ladder reaching the
// deck. Named parts (`cabGlassFront`, `cabGlassSide`, `roofRack`,
// `ladderRung`) let these be measured directly, the same pattern hull.ts
// uses for `flankPanel`/`crossMember`.

import { describe, it, expect } from 'vitest'
import { buildCab, advanceAntennaPhase, antennaSwayAngle, ANTENNA_SWAY_MAX, ANTENNA_SWAY_RATE } from './cab'
import { BODY, CAB } from '../spec'
import { MAX_SPEED } from '../crawler/constants'
import { mats, bounds, named } from './testSupport'

describe('cab component', () => {
  it('sits on the deck and reaches the authored roof', () => {
    const m = mats()
    const { group } = buildCab(m.body, m.dark, m.accent)
    const b = bounds(group)
    expect(b.min.y).toBeCloseTo(BODY.deckTop, 0)
    // The antenna pokes above the roof; the roof itself is at CAB.topY.
    expect(b.max.y).toBeLessThanOrEqual(CAB.topY + 2)
    expect(Math.abs(b.min.x)).toBeLessThanOrEqual(CAB.halfWidth + 0.5)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('is as wide as the I4 spec, not the old 7 m shed', () => {
    const m = mats()
    const { group } = buildCab(m.body, m.dark, m.accent)
    const b = bounds(group)
    // The body must actually REACH the widened half-width on both sides —
    // pairs with the existing "does not exceed" check above so the width
    // is pinned on both ends, not just capped.
    expect(b.max.x).toBeGreaterThanOrEqual(CAB.halfWidth - 0.1)
    expect(b.min.x).toBeLessThanOrEqual(-(CAB.halfWidth - 0.1))
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('wraps dark glass across the full front width, one continuous band, no mullions', () => {
    const m = mats()
    const { group } = buildCab(m.body, m.dark, m.accent)
    const front = named(group, 'cabGlassFront')
    // Exactly one front band, not several mullion-separated slots.
    expect(front.length).toBe(1)
    const b = bounds(front[0])
    // Spans (almost) the full authored width, not a narrow slot.
    expect(b.min.x).toBeLessThanOrEqual(-(CAB.halfWidth - 1))
    expect(b.max.x).toBeGreaterThanOrEqual(CAB.halfWidth - 1)
    // Plausible eye height for a raised control station: the cab body
    // spans deck (12) to topY (15) — a 1.8 m crew member standing on the
    // cab floor (the deck) has eyes roughly 1-2 m above it.
    expect(b.min.y).toBeGreaterThanOrEqual(BODY.deckTop + 0.5)
    expect(b.max.y).toBeLessThanOrEqual(BODY.deckTop + 3)
    expect(b.min.y).toBeLessThanOrEqual(BODY.deckTop + 2)
    expect(b.max.y).toBeGreaterThanOrEqual(BODY.deckTop + 1.5)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('wraps the same glass band halfway down each side, meeting the front at the corner', () => {
    const m = mats()
    const { group } = buildCab(m.body, m.dark, m.accent)
    const sides = named(group, 'cabGlassSide')
    expect(sides.length).toBe(2)
    for (const side of sides) {
      const b = bounds(side)
      // Roughly half the cab's total depth (2*halfDepth) — a wrap, not
      // the full flank and not a token sliver.
      const depthSpan = b.max.z - b.min.z
      expect(depthSpan).toBeGreaterThan(CAB.halfDepth * 0.5)
      expect(depthSpan).toBeLessThan(CAB.halfDepth * 1.5)
      // Starts at the front, at the windshield's z, so the wrap reads
      // continuous — no gap at the corner.
      expect(b.min.z).toBeLessThanOrEqual(CAB.zCenter - CAB.halfDepth + 0.6)
      // Same eye-height band as the front.
      expect(b.min.y).toBeGreaterThanOrEqual(BODY.deckTop + 0.5)
      expect(b.max.y).toBeLessThanOrEqual(BODY.deckTop + 3)
    }
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('carries a roof rack that sits on the roof and clears the antenna', () => {
    const m = mats()
    const { group } = buildCab(m.body, m.dark, m.accent)
    const rack = named(group, 'roofRack')
    expect(rack.length).toBeGreaterThanOrEqual(1)
    for (const r of rack) {
      const b = bounds(r)
      // Sits ON the roof, not floating or buried in it.
      expect(b.min.y).toBeGreaterThanOrEqual(CAB.topY - 0.1)
      expect(b.max.y).toBeLessThanOrEqual(CAB.topY + 2)
      // Stays inside the cab's own footprint.
      expect(Math.abs(b.min.x)).toBeLessThanOrEqual(CAB.halfWidth)
      expect(Math.abs(b.max.x)).toBeLessThanOrEqual(CAB.halfWidth)
    }
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('has a rear-face ladder within reach of the deck', () => {
    const m = mats()
    const { group } = buildCab(m.body, m.dark, m.accent)
    const rungs = named(group, 'ladderRung')
    expect(rungs.length).toBeGreaterThanOrEqual(3)
    expect(rungs.length).toBeLessThanOrEqual(4)
    const bottomY = Math.min(...rungs.map((r) => bounds(r).min.y))
    // Bottom rung reaches within half a metre of the deck — a person can
    // actually step onto it from the deck (the cab's own floor line).
    expect(bottomY).toBeLessThanOrEqual(BODY.deckTop + 0.5)
    for (const rung of rungs) {
      const b = bounds(rung)
      // Mounted on the REAR face (+Z, away from the cutter at -Z) — not
      // buried inside the cab body, not floating clear of the back.
      expect(b.min.z).toBeGreaterThanOrEqual(CAB.zCenter + CAB.halfDepth - 0.2)
      expect(b.max.z).toBeLessThanOrEqual(CAB.zCenter + CAB.halfDepth + 0.5)
      // Never reaches above the roof.
      expect(b.max.y).toBeLessThanOrEqual(CAB.topY)
    }
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('stays clear of the deck machinery ahead of it', () => {
    const m = mats()
    const { group } = buildCab(m.body, m.dark, m.accent)
    const b = bounds(group)
    // machinery.ts's forward-most deck fixture is the feed hopper
    // (cylinder, centre z=2, bottom radius 4.6) -> reaches to z=-2.6. The
    // cab, including its rear ladder and roof cap overhang, must clear it
    // with margin — no overhang was widened toward the machinery to get
    // there.
    expect(b.max.z).toBeLessThanOrEqual(-3)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  // I7 (immediate-improvements §9): antenna sway, driven by speed — "cheap,
  // alive, invisible when parked". Pure-maths claims first, then the wired
  // pivot.
  it('antenna sway is zero at rest, at any phase', () => {
    for (const phase of [0, Math.PI / 2, Math.PI, 4.2]) {
      expect(antennaSwayAngle(phase, 0, 0)).toBe(0)
    }
  })

  it('antenna sway is bounded at, and beyond, max speed', () => {
    // sin(pi/2) = 1, so this phase reads the amplitude directly.
    expect(antennaSwayAngle(Math.PI / 2, MAX_SPEED, MAX_SPEED)).toBeCloseTo(ANTENNA_SWAY_MAX, 6)
    // Driving past the machine's own max speed must not sway further.
    expect(antennaSwayAngle(Math.PI / 2, MAX_SPEED * 4, MAX_SPEED * 4)).toBeCloseTo(ANTENNA_SWAY_MAX, 6)
  })

  it('antenna phase advances only by dt, never by speed', () => {
    expect(advanceAntennaPhase(0.5, 0)).toBe(0.5)
    expect(advanceAntennaPhase(0, 1)).toBeGreaterThan(0)
  })

  it('the wired antenna pivot stays at zero while parked, for any duration', () => {
    const m = mats()
    const cab = buildCab(m.body, m.dark, m.accent)
    const pivot = named(cab.group, 'antennaPivot')[0]
    for (let i = 0; i < 5; i++) cab.update(0, 0, 0.37)
    expect(pivot.rotation.z).toBe(0)
    cab.group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('the wired antenna pivot sways, bounded, once driving', () => {
    const m = mats()
    const cab = buildCab(m.body, m.dark, m.accent)
    const pivot = named(cab.group, 'antennaPivot')[0]
    // dt chosen so the phase lands exactly at pi/2 from its phase-0 start —
    // sin(pi/2) = 1, reading the peak amplitude directly, no guessing.
    const dtToPeak = (Math.PI / 2) / ANTENNA_SWAY_RATE
    cab.update(MAX_SPEED, MAX_SPEED, dtToPeak)
    expect(pivot.rotation.z).toBeCloseTo(ANTENNA_SWAY_MAX, 6)
    cab.group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
