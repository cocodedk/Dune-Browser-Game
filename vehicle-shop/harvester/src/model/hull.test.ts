// vehicle-shop/harvester/src/model/hull.test.ts
// Per-component invariant for the hull — split out of the old
// src/components.test.ts (round I0) so no single file carries every part's
// assertions and outgrows the 200-line cap as later rounds (I2 lands here)
// add to it. See testSupport.ts for the shared mats()/bounds() helpers.

import { describe, it, expect } from 'vitest'
import { buildHull } from './hull'
import { BODY } from '../spec'
import { mats, bounds } from './testSupport'

describe('hull component', () => {
  it('is symmetric in X and spans the hull length', () => {
    const m = mats()
    const { group } = buildHull(m.body, m.dark)
    const b = bounds(group)
    expect(Math.abs(b.min.x + b.max.x)).toBeLessThan(1e-6)
    expect(b.min.z).toBeCloseTo(BODY.noseZ, 0)
    expect(b.max.z).toBeCloseTo(BODY.tailZ, 0)
    expect(b.size.y).toBeGreaterThan(10)
    for (const mat of Object.values(m)) mat.dispose()
  })
})
