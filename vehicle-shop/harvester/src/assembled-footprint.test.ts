// vehicle-shop/harvester/src/assembled-footprint.test.ts
// Guards the WHOLE assembly's footprint against OVERALL — split out of the
// old src/components.test.ts (round I0) as its own file because it is the
// one test that spans every part rather than belonging to one component.
// Sits at the root next to seam.test.ts for the same reason: the defect it
// guards lives BETWEEN the parts, not inside any one of them.
//
// Round 3's history is why this assertion is load-bearing, not decorative:
// it caught the nose/tail housings with X and Z placement swapped — the
// assembled footprint went 58.85m wide asymmetric — while every individual
// component test still passed.

import { describe, it, expect } from 'vitest'
import { Group } from 'three'
import { buildHull } from './model/hull'
import { buildTracks } from './model/tracks'
import { buildCutter } from './model/cutter'
import { buildCab } from './model/cab'
import { buildMachinery } from './model/machinery'
import { OVERALL } from './spec'
import { mats, bounds } from './model/testSupport'

describe('whole machine still meets its footprint', () => {
  it('assembled footprint matches OVERALL within the seam-test windows', () => {
    const m = mats()
    const root = new Group()
    root.add(buildHull(m.body, m.dark).group)
    root.add(buildTracks(m.dark, m.wheel, m.accent, m.dark).group)
    root.add(buildCutter(m.dark, m.accent).group)
    root.add(buildCab(m.body, m.dark, m.accent).group)
    root.add(buildMachinery(m.dark, m.accent).group)
    const b = bounds(root)
    expect(b.size.z).toBeGreaterThan(OVERALL.length - 2)
    expect(b.size.z).toBeLessThan(OVERALL.length + 2)
    expect(b.size.x).toBeGreaterThan(OVERALL.width - 2)
    expect(b.size.x).toBeLessThan(OVERALL.width + 2)
    expect(b.size.y).toBeLessThan(OVERALL.height + 2)
    root.clear()
    for (const mat of Object.values(m)) mat.dispose()
  })
})
