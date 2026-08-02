// vehicle-shop/harvester/src/model/machinery.test.ts
// Per-component invariant for the deck machinery — split out of the old
// src/components.test.ts (round I0). See hull.test.ts for why the split
// exists, and testSupport.ts for the shared mats()/bounds() helpers.

import { describe, it, expect } from 'vitest'
import { buildMachinery } from './machinery'
import { BODY } from '../spec'
import { mats, bounds } from './testSupport'

describe('machinery component', () => {
  it('stays on the deck, inside the hull plan', () => {
    const m = mats()
    const { group } = buildMachinery(m.dark, m.accent)
    const b = bounds(group)
    expect(b.min.y).toBeGreaterThanOrEqual(BODY.deckTop - 0.1)
    expect(Math.abs(b.max.x)).toBeLessThan(BODY.halfWidth + 0.2)
    expect(b.min.z).toBeGreaterThan(BODY.noseZ)
    expect(b.max.z).toBeLessThan(BODY.tailZ)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
