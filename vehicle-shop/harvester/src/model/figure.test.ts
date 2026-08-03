// vehicle-shop/harvester/src/model/figure.test.ts
// Pins the crew figure's scale — I5's own correctness question is whether
// this is genuinely 1.8m against the spec's 12m deck, not shrunk to fit.

import { describe, it, expect } from 'vitest'
import type { Mesh, Object3D } from 'three'
import { buildFigure, FIGURE } from './figure'
import { BODY, CAB } from '../spec'
import { mats, bounds, named } from './testSupport'

describe('crew figure', () => {
  it('stands 1.8m tall, on the deck plane', () => {
    const m = mats()
    const { group } = buildFigure(m.dark, m.accent)
    const b = bounds(group)
    expect(b.size.y).toBeCloseTo(FIGURE.height, 1)
    expect(b.min.y).toBeCloseTo(BODY.deckTop, 1)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('carries the torso in accent material for contrast, legs/head dark', () => {
    const m = mats()
    const { group } = buildFigure(m.dark, m.accent)
    const torso = named(group, 'figureTorso')[0] as Object3D & Mesh
    const legs = named(group, 'figureLegs')[0] as Object3D & Mesh
    expect(torso.material).toBe(m.accent)
    expect(legs.material).toBe(m.dark)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })

  it('stands beside the cab, clear of its halfWidth, at the cab\'s own z', () => {
    const m = mats()
    const { group } = buildFigure(m.dark, m.accent)
    const b = bounds(group)
    // Outboard of the cab's own width (port side) — the figure and the cab
    // never touch. b.max.x is the figure's edge NEAREST the centreline
    // since FIGURE.x is negative, so it is the one that must clear halfWidth.
    expect(Math.abs(b.max.x)).toBeGreaterThan(CAB.halfWidth)
    // But at the cab's own z-span, so the two appear TOGETHER in frame,
    // not "somewhere on the deck".
    expect(b.min.z).toBeGreaterThanOrEqual(CAB.zCenter - CAB.halfDepth)
    expect(b.max.z).toBeLessThanOrEqual(CAB.zCenter + CAB.halfDepth)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
