// vehicle-shop/harvester/src/model/tracks.test.ts
// Per-component invariants for the tracks — split out of the old
// src/components.test.ts (round I0). See hull.test.ts for why the split
// exists, and testSupport.ts for the shared mats()/bounds() helpers. This
// file is the one I1 (the belt) grows next, so it starts with headroom.

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { buildTracks } from './tracks'
import { buildBelt } from './belt'
import { TRACK } from '../spec'
import { mats, bounds } from './testSupport'
import { BELT_THICKNESS, WRAP_RADIUS } from './beltPhase'

/** Every descendant carrying `name`, in build order. */
function named(root: Object3D, name: string): Object3D[] {
  const found: Object3D[] = []
  root.traverse((child) => {
    if (child.name === name) found.push(child)
  })
  return found
}

describe('tracks component', () => {
  it('has eighteen runners (4 road wheels + 2 sprockets + 3 rollers per side) and a symmetric footprint', () => {
    const m = mats()
    const { group } = buildTracks(m.dark, m.wheel, m.accent, m.dark)
    let wheels = 0
    group.traverse((child) => {
      if (child.name === 'wheel') wheels++
    })
    expect(wheels).toBe(18)
    const b = bounds(group)
    // Both pods reach the same distance from the centreline.
    expect(Math.abs(b.min.x)).toBeCloseTo(Math.abs(b.max.x), 1)
    expect(b.min.x).toBeLessThan(-14)
    // The band sits on the ground line.
    expect(b.min.y).toBeCloseTo(0, 0)
    expect(b.max.y).toBeGreaterThan(10)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('no runner overlaps another along the belt — the user\'s front/rear collision, pinned', () => {
    const spans: Array<[number, number]> = [
      ...TRACK.roadWheelsZ.map((z): [number, number] => [z - TRACK.roadWheelRadius, z + TRACK.roadWheelRadius]),
      ...TRACK.sprocketZ.map((z): [number, number] => [z - TRACK.sprocketRadius, z + TRACK.sprocketRadius]),
      ...TRACK.returnRollersZ.map((z): [number, number] => [z - TRACK.returnRollerRadius, z + TRACK.returnRollerRadius]),
    ]
    spans.sort((a, b) => a[0] - b[0])
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i][0]).toBeGreaterThanOrEqual(spans[i - 1][1])
    }
  })
})

describe('belt component', () => {
  it('carries exactly the spec link count — two runs plus two wraps', () => {
    const m = mats()
    const belt = buildBelt(1, m.dark)
    const bottom = named(belt.group, 'belt-link-bottom')
    const top = named(belt.group, 'belt-link-top')
    const wrap = named(belt.group, 'belt-link-wrap')
    expect(bottom.length).toBe(TRACK.beltLinks.straightPerRun)
    expect(top.length).toBe(TRACK.beltLinks.straightPerRun)
    expect(wrap.length).toBe(2 * TRACK.beltLinks.wrapPerSprocket)
    // Read from spec, so a silent density change fails here.
    expect(bottom.length + top.length + wrap.length).toBe(
      2 * TRACK.beltLinks.straightPerRun + 2 * TRACK.beltLinks.wrapPerSprocket,
    )
    belt.dispose()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('wraps around the OUTSIDE of both sprockets — the round-16 direction bug', () => {
    const m = mats()
    const belt = buildBelt(1, m.dark)
    const [front, rear] = TRACK.sprocketZ
    let atFront = 0
    let atRear = 0
    for (const link of named(belt.group, 'belt-link-wrap')) {
      const z = link.position.z
      // Nothing curves back between the sprockets: the belly points at the
      // nose up front and at the tail aft.
      expect(z <= front + 1e-9 || z >= rear - 1e-9).toBe(true)
      if (z <= front + 1e-9) atFront++
      if (z >= rear - 1e-9) atRear++
    }
    expect(atFront).toBe(TRACK.beltLinks.wrapPerSprocket)
    expect(atRear).toBe(TRACK.beltLinks.wrapPerSprocket)
    belt.dispose()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('lays the bottom run ON the ground, and the wheels ride on the belt', () => {
    const m = mats()
    const belt = buildBelt(1, m.dark)
    // Precision 6, not 9: Box3 reads back float32 vertex data.
    for (const link of named(belt.group, 'belt-link-bottom')) {
      expect(bounds(link).min.y).toBeCloseTo(0, 6)
    }
    belt.dispose()
    // Round 14, pinned: the belt is the ground medium, so the lowest runner
    // sits on the belt's top face, never on the sand.
    const tracks = buildTracks(m.dark, m.wheel, m.accent, m.dark)
    const lowest = Math.min(...named(tracks.group, 'wheel').map((w) => bounds(w).min.y))
    expect(BELT_THICKNESS).toBeCloseTo(TRACK.sprocketY - TRACK.sprocketRadius, 9)
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

  it('scrolls: the bottom run runs REARWARD (+Z) at forward drive', () => {
    const m = mats()
    const tracks = buildTracks(m.dark, m.wheel, m.accent, m.dark)
    // Track the same objects across the step, and pick ones at the START of
    // their run so neither is handed to a wrap mid-test.
    const bottom = named(tracks.group, 'belt-link-bottom')
      .reduce((a, b) => (a.position.z <= b.position.z ? a : b))
    const top = named(tracks.group, 'belt-link-top')
      .reduce((a, b) => (a.position.z >= b.position.z ? a : b))
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
    // stay meshed with the belt's lugs instead of slipping past them.
    expect(sprocket.rotation.x - r0).toBeCloseTo(-0.3 / WRAP_RADIUS, 9)
    tracks.update(-0.6, -0.6, 0.5)
    expect(bottom.position.z - z0).toBeCloseTo(0, 9)
    tracks.dispose()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
