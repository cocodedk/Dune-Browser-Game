// src/game-render/modes/strategic/markerLayout.test.ts

import { describe, it, expect } from 'vitest'
import {
  SOURCE_WIDTH,
  SOURCE_HEIGHT,
  projectToWorld,
  layoutMarkers,
  worldToSource,
  nearestMarker,
} from './markerLayout'
import type { MarkerPlacement } from './markerLayout'

const SPREAD = 1000

// ---------------------------------------------------------------------------
// projectToWorld
// ---------------------------------------------------------------------------

describe('projectToWorld', () => {
  it('maps the canvas centre to the world origin', () => {
    const p = projectToWorld({ x: SOURCE_WIDTH / 2, y: SOURCE_HEIGHT / 2 }, SPREAD)
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.z).toBeCloseTo(0, 6)
  })

  it('maps the canvas corners to opposite world corners', () => {
    const topLeft = projectToWorld({ x: 0, y: 0 }, SPREAD)
    expect(topLeft.x).toBeCloseTo(-SPREAD / 2, 6)
    expect(topLeft.z).toBeCloseTo(-SPREAD / 2, 6)

    const bottomRight = projectToWorld({ x: SOURCE_WIDTH, y: SOURCE_HEIGHT }, SPREAD)
    expect(bottomRight.x).toBeCloseTo(SPREAD / 2, 6)
    expect(bottomRight.z).toBeCloseTo(SPREAD / 2, 6)
  })

  it('scales linearly with spread', () => {
    const a = projectToWorld({ x: 600, y: 400 }, 1000)
    const b = projectToWorld({ x: 600, y: 400 }, 2000)
    expect(b.x).toBeCloseTo(a.x * 2, 6)
    expect(b.z).toBeCloseTo(a.z * 2, 6)
  })

  it('preserves left/right and top/bottom ordering', () => {
    const left = projectToWorld({ x: 100, y: 250 }, SPREAD)
    const right = projectToWorld({ x: 700, y: 250 }, SPREAD)
    expect(left.x).toBeLessThan(right.x)

    const top = projectToWorld({ x: 400, y: 50 }, SPREAD)
    const bottom = projectToWorld({ x: 400, y: 450 }, SPREAD)
    expect(top.z).toBeLessThan(bottom.z)
  })
})

// ---------------------------------------------------------------------------
// Round trip
// ---------------------------------------------------------------------------

describe('worldToSource', () => {
  it('inverts projectToWorld', () => {
    for (const point of [
      { x: 0, y: 0 },
      { x: 400, y: 250 },
      { x: 799, y: 499 },
      { x: 123, y: 456 },
    ]) {
      const world = projectToWorld(point, SPREAD)
      const back = worldToSource(world.x, world.z, SPREAD)
      expect(back.x).toBeCloseTo(point.x, 4)
      expect(back.y).toBeCloseTo(point.y, 4)
    }
  })
})

// ---------------------------------------------------------------------------
// layoutMarkers
// ---------------------------------------------------------------------------

describe('layoutMarkers', () => {
  it('preserves ids and count', () => {
    const out = layoutMarkers(
      [
        { id: 'a', position: { x: 0, y: 0 } },
        { id: 'b', position: { x: 800, y: 500 } },
      ],
      SPREAD,
    )
    expect(out.map(p => p.id)).toEqual(['a', 'b'])
  })

  it('returns an empty array for no input', () => {
    expect(layoutMarkers([], SPREAD)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// nearestMarker
// ---------------------------------------------------------------------------

describe('nearestMarker', () => {
  const placements: MarkerPlacement[] = [
    { id: 'near', x: 0, z: 0 },
    { id: 'far', x: 500, z: 500 },
  ]

  it('finds the closest placement', () => {
    expect(nearestMarker(placements, 10, 10, 100)?.id).toBe('near')
    expect(nearestMarker(placements, 480, 490, 100)?.id).toBe('far')
  })

  it('returns null when nothing is in range', () => {
    // Clicking empty sand must deselect, not snap to a distant sietch.
    expect(nearestMarker(placements, 250, 250, 50)).toBeNull()
  })

  it('includes a placement exactly at the range limit', () => {
    expect(nearestMarker(placements, 100, 0, 100)?.id).toBe('near')
  })

  it('returns null for an empty set', () => {
    expect(nearestMarker([], 0, 0, 1000)).toBeNull()
  })
})
