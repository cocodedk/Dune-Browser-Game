// vehicle-shop/harvester/src/model/cutter.test.ts
// Per-component invariants for the cutter — split out of the old
// src/components.test.ts (round I0). See hull.test.ts for why the split
// exists, and testSupport.ts for the shared mats()/bounds()/named() helpers.
//
// The drum's DIRECTION and RATE are pinned next door in cutterDetail.test.ts
// (pure arithmetic). What this file pins is the geometry the round-5 and
// round-I3 rulings actually bought: the head is spec-tall, the teeth scrape
// the sand, the drum is the frontmost thing on the machine, and the cutter
// still cannot grow past the tip line the footprint tests depend on.

import { describe, it, expect } from 'vitest'
import type { Mesh } from 'three'
import { buildCutter } from './cutter'
import { ARM, HEAD, DRUM, drumAngularSpeed } from './cutterDetail'
import { BOOM } from '../spec'
import { mats, bounds, named } from './testSupport'

function cutter() {
  const m = mats()
  const part = buildCutter(m.dark, m.accent)
  part.group.updateMatrixWorld(true)
  return {
    ...part,
    m,
    done() {
      part.group.clear()
      for (const mat of Object.values(m)) mat.dispose()
    },
  }
}

describe('cutter component', () => {
  it('is the frontmost part, its teeth reaching the tip line', () => {
    const c = cutter()
    const b = bounds(c.group)
    expect(b.min.z).toBeLessThan(BOOM.tipZ)
    // Round I3 grew the head; the TIP may not travel with it. OVERALL.length
    // is 60 from the tail face at +24, and assembled-footprint.test.ts holds
    // the whole machine to within 2m of that, so the cutter's own nose has
    // to stay inside this window or that test goes red instead of this one.
    expect(b.min.z).toBeGreaterThan(BOOM.tipZ - 2)
    // The head is wide — the signature read from a hero shot.
    expect(b.size.x).toBeGreaterThan(BOOM.cutterHalfWidth * 2 - 1)
    c.done()
  })

  it('puts the DRUM at the very front, ahead of the head it hangs on', () => {
    const c = cutter()
    const drum = named(c.group, 'cutterDrum')[0]
    expect(drum).toBeDefined()
    const whole = bounds(c.group)
    const db = bounds(drum)
    // Nothing on the machine reaches further forward than the drum's picks.
    expect(db.min.z).toBeCloseTo(whole.min.z, 6)
    // And it stands proud of the head's own front face, not buried in it.
    expect(db.min.z).toBeLessThan(HEAD.frontZ - 3)
    expect(drum.position.z).toBeLessThan(HEAD.frontZ)
    // A drum, not a disc: its barrel spans the head's width along X.
    expect(db.size.x).toBeGreaterThan(BOOM.cutterHalfWidth * 2 - 3)
    c.done()
  })

  it('grows the head to spec.headHeight while keeping it low', () => {
    const c = cutter()
    const head = named(c.group, 'cutterHead')[0]
    const hb = bounds(head)
    expect(hb.size.y).toBeCloseTo(BOOM.headHeight, 1)
    expect(HEAD.height).toBe(BOOM.headHeight)
    // Low: the head's own bottom sits nearer the sand than the deck, and the
    // whole assembly stays under the cab (spec CAB.topY = 15).
    expect(hb.min.y).toBeLessThan(2)
    expect(bounds(c.group).max.y).toBeLessThan(15)
    // It dominates the front: taller than the boom that carries it, and as
    // wide as the cutter half-width allows.
    expect(hb.size.y).toBeGreaterThan(ARM.height * 1.5)
    expect(hb.size.x).toBeGreaterThan(BOOM.cutterHalfWidth * 2 - 1)
    c.done()
  })
})

describe('the teeth still scrape the sand', () => {
  it('keeps seven fixed lip teeth within half a metre of the ground line', () => {
    const c = cutter()
    const teeth = named(c.group, 'cutterTooth')
    expect(teeth).toHaveLength(7)
    for (const tooth of teeth) {
      const tb = bounds(tooth)
      expect(tb.min.y).toBeGreaterThan(0)
      expect(tb.min.y).toBeLessThan(0.5)
    }
    // Behind the drum's swept circle — a fixed tooth inside it would be
    // milled off by the drum it shares the throat with.
    const sweep = DRUM.pickReach
    for (const tooth of teeth) {
      const tb = bounds(tooth)
      const dz = Math.abs(tb.min.z - DRUM.axisZ)
      const dy = Math.abs(tb.max.y - DRUM.axisY)
      expect(Math.hypot(dz, dy)).toBeGreaterThan(sweep)
    }
    c.done()
  })

  it('rings the drum with picks that reach the same bed', () => {
    const c = cutter()
    const picks = named(c.group, 'drumPick')
    expect(picks).toHaveLength(DRUM.stations.length * DRUM.picksAround)
    const pb = bounds(named(c.group, 'cutterDrum')[0])
    expect(pb.min.y).toBeGreaterThan(0)
    expect(pb.min.y).toBeLessThan(0.5)
    c.done()
  })
})

describe('the cutter animates from the track speeds', () => {
  it('spins the drum the feeding way, by exactly the derived angle', () => {
    const c = cutter()
    const drum = named(c.group, 'cutterDrum')[0]
    expect(drum.rotation.x).toBe(0)
    c.update(2, 2, 0.5)
    expect(drum.rotation.x).toBeCloseTo(drumAngularSpeed(2, 2) * 0.5, 9)
    expect(drum.rotation.x).toBeLessThan(0)
    const spun = drum.rotation.x
    // Parked machine, parked drum.
    c.update(0, 0, 1)
    expect(drum.rotation.x).toBe(spun)
    c.done()
  })
})

describe('the boom reads as structure, and the feed path as plumbing', () => {
  it('carries canted flank fairings and ribs instead of buried rails', () => {
    const c = cutter()
    const fairings = named(c.group, 'cutterFairing')
    expect(fairings.length).toBeGreaterThanOrEqual(4)
    for (const fairing of fairings) {
      // Canted — a fairing parallel to the flank is the flat box we replaced.
      expect(Math.abs((fairing as Mesh).rotation.z)).toBeGreaterThan(0.1)
      // And PROUD of the arm's own half-width, or it is invisible geometry —
      // which is exactly what the rails it replaced were, buried inside the
      // 14m-wide arm box at x = +-5.5 and visible from nowhere.
      const fb = bounds(fairing)
      expect(Math.max(Math.abs(fb.min.x), Math.abs(fb.max.x))).toBeGreaterThan(ARM.halfWidth - 0.9)
    }
    expect(named(c.group, 'cutterRib').length).toBeGreaterThanOrEqual(4)
    c.done()
  })

  it('runs an angled truss conveyor from the head up to the hopper', () => {
    const c = cutter()
    const belt = named(c.group, 'conveyorBelt')[0] as Mesh
    expect(belt).toBeDefined()
    // Sloped, and sloped the machinery.ts way: rotation.x < 0 raises the AFT
    // end, so the belt climbs from the head toward the hopper behind it.
    expect(belt.rotation.x).toBeLessThan(-0.1)
    // Not vertical (the standing complaint about the deck conveyor) and not
    // flat: a real incline, between 10 and 40 degrees.
    expect(Math.abs(belt.rotation.x)).toBeLessThan(0.7)
    const cb = bounds(belt)
    expect(cb.min.z).toBeGreaterThan(HEAD.frontZ)
    expect(cb.max.z).toBeLessThan(ARM.aftZ)
    expect(named(c.group, 'conveyorDrum')).toHaveLength(2)
    expect(named(c.group, 'conveyorLeg').length).toBeGreaterThanOrEqual(4)
    c.done()
  })

  it('braces the boom with two rams anchored beside the nose', () => {
    const c = cutter()
    const rams = named(c.group, 'cutterRam')
    expect(rams).toHaveLength(2)
    for (const ram of rams) {
      // Angled, not upright and not lying flat.
      const tilt = Math.abs((ram as Mesh).rotation.x)
      expect(tilt).toBeGreaterThan(0.2)
      expect(tilt).toBeLessThan(Math.PI - 0.2)
    }
    expect(rams[0].position.x).toBeCloseTo(-rams[1].position.x, 6)
    const anchors = named(c.group, 'cutterRamAnchor')
    expect(anchors).toHaveLength(2)
    for (const anchor of anchors) {
      // Adjacent to the nose face (hull.ts is another round's file: the rams
      // reach it, they do not modify it).
      expect(Math.abs(anchor.position.z - ARM.aftZ)).toBeLessThan(1.5)
      expect(anchor.position.y).toBeGreaterThan(ARM.top)
    }
    c.done()
  })
})
