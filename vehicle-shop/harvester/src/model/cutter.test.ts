// vehicle-shop/harvester/src/model/cutter.test.ts
// Per-component invariant for the cutter — split out of the old
// src/components.test.ts (round I0). See hull.test.ts for why the split
// exists, and testSupport.ts for the shared mats()/bounds() helpers.

import { describe, it, expect } from 'vitest'
import { buildCutter } from './cutter'
import { BOOM } from '../spec'
import { mats, bounds } from './testSupport'

describe('cutter component', () => {
  it('is the frontmost part, its teeth reaching the tip line', () => {
    const m = mats()
    const { group } = buildCutter(m.dark, m.accent)
    const b = bounds(group)
    expect(b.min.z).toBeLessThan(BOOM.tipZ)
    expect(b.min.z).toBeGreaterThan(BOOM.tipZ - 2)
    // The head is wide — the signature read from a hero shot.
    expect(b.size.x).toBeGreaterThan(BOOM.cutterHalfWidth * 2 - 1)
    group.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
