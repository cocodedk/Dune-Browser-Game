// vehicle-shop/harvester/src/model/belt.test.ts
// The BELT's geometry invariants, measured off the real three.js objects —
// the companion to beltPhase.test.ts, which pins the same belt's maths with
// no three.js at all. Split out of tracks.test.ts in round I1 pass 2, when
// the belt's own assertions outgrew the file that hosted them (the 200-line
// cap is checked on the STAGED set, before the npm gates run).
//
// Everything here is measured off geometry, never off spec constants, so a
// stale spec entry and a stale builder cannot cancel each other out.

import { describe, it, expect } from 'vitest'
import type { BoxGeometry, Mesh, Object3D } from 'three'
import { buildTracks } from './tracks'
import { buildBelt } from './belt'
import { TRACK } from '../spec'
import { mats, bounds, named } from './testSupport'
import { BELT_THICKNESS, WRAP_RADIUS, BOTTOM_RUN_Y, TOP_RUN_Y, LINK_LENGTH } from './beltPhase'

/** The plates currently on a run, by height: the chain flows, so which links
 *  those are changes with the phase. */
function onRun(links: Object3D[], y: number): Object3D[] {
  return links.filter((l) => Math.abs(l.position.y - y) < 1e-9)
}

describe('belt component', () => {
  it('is ONE chain of identical plates, at exactly the spec link count', () => {
    const m = mats()
    const belt = buildBelt(1, m.dark, m.dark)
    belt.group.updateMatrixWorld(true)
    const links = named(belt.group, 'belt-link')
    // Read from spec, so a silent density change fails here.
    expect(links.length).toBe(
      2 * TRACK.beltLinks.straightPerRun + 2 * TRACK.beltLinks.wrapPerSprocket,
    )
    expect(links.length).toBe(74)
    // The pass-2 ruling, pinned: no link is a special size. A wrap plate and
    // a ground plate are the same box.
    const depths = new Set(
      named(belt.group, 'link-plate').map(
        (plate) => ((plate as Mesh).geometry as BoxGeometry).parameters.depth,
      ),
    )
    expect(depths.size).toBe(1)
    expect([...depths][0]).toBeCloseTo(LINK_LENGTH, 6)
    belt.dispose()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('wraps around the OUTSIDE of both sprockets — the round-16 direction bug', () => {
    const m = mats()
    const belt = buildBelt(1, m.dark, m.dark)
    belt.group.updateMatrixWorld(true)
    const [front, rear] = TRACK.sprocketZ
    const links = named(belt.group, 'belt-link')
    let atFront = 0
    let atRear = 0
    for (const link of links) {
      const onBottom = Math.abs(link.position.y - BOTTOM_RUN_Y) < 1e-9
      const onTop = Math.abs(link.position.y - TOP_RUN_Y) < 1e-9
      if (onBottom || onTop) continue
      const z = link.position.z
      // Nothing curves back between the sprockets: the belly points at the
      // nose up front and at the tail aft.
      expect(z <= front + 1e-9 || z >= rear - 1e-9).toBe(true)
      if (z <= front + 1e-9) atFront++
      else atRear++
    }
    // Both wraps are populated, each to within a link of its spec count (the
    // chain flows, so a wrap holds 8 plates or 9, never a fixed slot list).
    expect(atFront).toBeGreaterThanOrEqual(TRACK.beltLinks.wrapPerSprocket - 1)
    expect(atRear).toBeGreaterThanOrEqual(TRACK.beltLinks.wrapPerSprocket - 1)
    belt.dispose()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('lays the bottom run ON the ground, and the wheels ride on the belt', () => {
    const m = mats()
    const belt = buildBelt(1, m.dark, m.dark)
    belt.group.updateMatrixWorld(true)
    const bottom = onRun(named(belt.group, 'belt-link'), BOTTOM_RUN_Y)
    expect(bottom.length).toBeGreaterThanOrEqual(TRACK.beltLinks.straightPerRun - 1)
    // Precision 6, not 9: Box3 reads back float32 vertex data. Nothing on the
    // plate — ridge or joint bar — may dip under the sand.
    for (const link of bottom) {
      expect(bounds(link).min.y).toBeCloseTo(0, 6)
    }
    belt.dispose()
    // Round 14, pinned: the belt is the ground medium, so the lowest runner
    // sits on the belt's top face, never on the sand.
    const tracks = buildTracks(m.dark, m.wheel, m.accent, m.dark)
    // From the ROOT: bounds() only refreshes the subtree it is handed, so a
    // mesh measured on its own would inherit a stale parent transform.
    tracks.group.updateMatrixWorld(true)
    // The runners that RIDE the belt: road wheels and return rollers. A
    // sprocket is excluded by its teeth, which are MEANT to reach past the
    // belt's outer face — that is the engagement, not a runner touching sand.
    const riders = named(tracks.group, 'wheel')
      .filter((w) => named(w, 'sprocket-tooth').length === 0)
    expect(riders.length).toBe((TRACK.roadWheelsZ.length + TRACK.returnRollersZ.length) * 2)
    const lowest = Math.min(...riders.map((w) => bounds(w).min.y))
    expect(BELT_THICKNESS).toBeCloseTo(TRACK.sprocketY - TRACK.sprocketRadius, 9)
    // The sprocket's DRUM sits on the belt's inner face like everything else.
    for (const drum of named(tracks.group, 'sprocket-drum')) {
      expect(bounds(drum).min.y).toBeCloseTo(BELT_THICKNESS, 1)
    }
    // The lowest runner stands ON the belt's top face — no runner reaches the
    // sand, and none floats above the belt either. The only thing below that
    // face is the road wheel's rubber tread, which wheel.ts builds 1% proud
    // of the tire and which therefore presses into the belt by that much.
    const treadProud = TRACK.roadWheelRadius * 0.01
    expect(lowest).toBeLessThanOrEqual(BELT_THICKNESS + 1e-6)
    expect(lowest).toBeGreaterThanOrEqual(BELT_THICKNESS - treadProud - 1e-6)
    tracks.dispose()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('carries the top run on the return rollers, with no daylight between', () => {
    const m = mats()
    const tracks = buildTracks(m.dark, m.wheel, m.accent, m.dark)
    const topUnder = TOP_RUN_Y - BELT_THICKNESS / 2
    const rollers = named(tracks.group, 'wheel')
      .filter((w) => TRACK.returnRollersZ.some((rz) => Math.abs(w.position.z - rz) < 1e-9))
    expect(rollers.length).toBe(TRACK.returnRollersZ.length * 2)
    for (const roller of rollers) {
      const b = bounds(roller)
      // The crown reaches the belt's under-face (the 1%-proud tread presses
      // in, exactly as the road wheels do below).
      expect(b.max.y).toBeGreaterThanOrEqual(topUnder - 1e-6)
      expect(b.max.y).toBeLessThanOrEqual(topUnder + TRACK.returnRollerRadius * 0.02)
      // It stays NARROWER than the plates it carries — a roller does not
      // stick out past its own track.
      expect(b.max.x - b.min.x).toBeLessThan(TRACK.belt.outerWidth)
    }
    // The track frame is what a viewer actually sees carrying the top run: it
    // fills the slot between the road wheels' crowns and the belt's
    // under-face, which is where the sky used to show through.
    const rails = named(tracks.group, 'track-frame')
    expect(rails.length).toBe(4)
    const roadWheelTop = TRACK.sprocketY - TRACK.sprocketRadius + TRACK.roadWheelRadius * 2
    for (const railMesh of rails) {
      const b = bounds(railMesh)
      expect(b.max.y).toBeCloseTo(topUnder, 6)
      expect(b.min.y).toBeGreaterThanOrEqual(roadWheelTop)
      expect(b.min.y).toBeLessThan(roadWheelTop + 0.1)
      // Clear of the rollers inboard and of the belt's plates outboard.
      const fromPodCentre = Math.abs(b.max.x) - TRACK.centreX
      expect(Math.abs(fromPodCentre)).toBeLessThan(TRACK.belt.outerWidth / 2)
    }
    tracks.dispose()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('scrolls: the bottom run runs REARWARD (+Z) at forward drive', () => {
    const m = mats()
    const tracks = buildTracks(m.dark, m.wheel, m.accent, m.dark)
    const links = named(tracks.group, 'belt-link')
    // Track the same objects across the step, and pick ones at the START of
    // their run so neither reaches a wrap mid-test.
    const bottom = onRun(links, BOTTOM_RUN_Y).reduce((a, b) => (a.position.z <= b.position.z ? a : b))
    const top = onRun(links, TOP_RUN_Y).reduce((a, b) => (a.position.z >= b.position.z ? a : b))
    const sprocket = named(tracks.group, 'wheel')
      .find((w) => Math.abs(w.position.z - TRACK.sprocketZ[1]) < 1e-9)!
    const z0 = bottom.position.z
    const t0 = top.position.z
    const r0 = sprocket.rotation.x
    tracks.update(0.6, 0.6, 0.5)
    // Forward drive: the ground run stands still against the sand, so against
    // the hull it moves aft. 0.6 m/s over 0.5s is 0.3m.
    expect(bottom.position.z - z0).toBeCloseTo(0.3, 9)
    expect(top.position.z - t0).toBeCloseTo(-0.3, 9)
    // The sprocket turns at exactly the belt's own orbit rate, so its teeth
    // hold their place against the plates instead of crawling across them.
    expect(sprocket.rotation.x - r0).toBeCloseTo(-0.3 / WRAP_RADIUS, 9)
    tracks.update(-0.6, -0.6, 0.5)
    expect(bottom.position.z - z0).toBeCloseTo(0, 9)
    tracks.dispose()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
