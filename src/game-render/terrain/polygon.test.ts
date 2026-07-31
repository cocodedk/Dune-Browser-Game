// src/game-render/terrain/polygon.test.ts

import { describe, it, expect } from 'vitest'
import { pointInPolygon } from './polygon'
import type { Vertex } from './polygon'

const SQUARE: Vertex[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
]

// Arrow-shaped, with a notch cut into the right side.
const CONCAVE: Vertex[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [5, 5],
  [0, 10],
]

describe('pointInPolygon: convex', () => {
  it('accepts an interior point', () => {
    expect(pointInPolygon(5, 5, SQUARE)).toBe(true)
  })

  it('rejects points outside on every side', () => {
    expect(pointInPolygon(-1, 5, SQUARE)).toBe(false)
    expect(pointInPolygon(11, 5, SQUARE)).toBe(false)
    expect(pointInPolygon(5, -1, SQUARE)).toBe(false)
    expect(pointInPolygon(5, 11, SQUARE)).toBe(false)
  })

  it('rejects a point diagonally outside a corner', () => {
    expect(pointInPolygon(-3, -3, SQUARE)).toBe(false)
  })
})

describe('pointInPolygon: concave', () => {
  it('accepts a point inside a solid part', () => {
    expect(pointInPolygon(2, 2, CONCAVE)).toBe(true)
  })

  it('rejects a point inside the notch', () => {
    // Above the V, between the two upper arms — outside despite sitting
    // within the bounding box. This is the case a bounding-box test gets wrong.
    expect(pointInPolygon(5, 9, CONCAVE)).toBe(false)
  })

  it('accepts a point below the notch', () => {
    expect(pointInPolygon(5, 3, CONCAVE)).toBe(true)
  })
})

describe('pointInPolygon: degenerate input', () => {
  it('returns false for an empty vertex list', () => {
    expect(pointInPolygon(0, 0, [])).toBe(false)
  })

  it('returns false for a line — it encloses nothing', () => {
    expect(pointInPolygon(0, 0, [[0, 0], [1, 1]])).toBe(false)
  })

  it('never throws on a horizontal-edge polygon', () => {
    // Horizontal edges are where a naive implementation divides by zero.
    const flat: Vertex[] = [[0, 0], [10, 0], [10, 5], [0, 5]]
    expect(() => pointInPolygon(5, 0, flat)).not.toThrow()
    expect(pointInPolygon(5, 2.5, flat)).toBe(true)
  })
})

describe('pointInPolygon: winding order', () => {
  it('gives the same answer for reversed vertex order', () => {
    const reversed = [...SQUARE].reverse()
    expect(pointInPolygon(5, 5, reversed)).toBe(true)
    expect(pointInPolygon(20, 5, reversed)).toBe(false)
  })
})
