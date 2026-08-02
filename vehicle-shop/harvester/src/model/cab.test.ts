// vehicle-shop/harvester/src/model/cab.test.ts
// Per-component invariant for the cab — split out of the old
// src/components.test.ts (round I0). See hull.test.ts for why the split
// exists, and testSupport.ts for the shared mats()/bounds() helpers.

import { describe, it, expect } from 'vitest'
import { buildCab } from './cab'
import { BODY, CAB } from '../spec'
import { mats, bounds } from './testSupport'

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
})
