// vehicle-shop/harvester/src/model/tracks.test.ts
// Per-component invariants for the tracks — split out of the old
// src/components.test.ts (round I0). See hull.test.ts for why the split
// exists, and testSupport.ts for the shared mats()/bounds() helpers. This
// file is the one I1 (the belt) grows next, so it starts with headroom.

import { describe, it, expect } from 'vitest'
import { buildTracks } from './tracks'
import { TRACK } from '../spec'
import { mats, bounds } from './testSupport'

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
