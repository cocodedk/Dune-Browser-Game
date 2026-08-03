// vehicle-shop/harvester/src/stage/groundcar.test.ts
// Pins the parked groundcar's scale (immediate-improvements.md §7: "a 4m
// groundcar") and its placement clear of the harvester's own footprint.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import { buildGroundcar, GROUNDCAR_LENGTH } from './groundcar'
import { GROUNDCAR_POSITION } from './terrain'
import { OVERALL } from '../spec'

describe('groundcar', () => {
  it('is about 4m long and sits on its own local ground plane', () => {
    const { group, dispose } = buildGroundcar()
    group.updateMatrixWorld(true)
    const box = new Box3().setFromObject(group)
    const size = box.getSize(new Vector3())
    expect(size.z).toBeCloseTo(GROUNDCAR_LENGTH, 1)
    expect(box.min.y).toBeCloseTo(0, 1)
    group.clear()
    dispose()
  })

  it("is parked outside the harvester's own footprint", () => {
    // OVERALL.width is the full span over both tracks; half of it is the
    // harvester's own lateral reach from the centreline.
    expect(Math.abs(GROUNDCAR_POSITION.x)).toBeGreaterThan(OVERALL.width / 2)
  })

  it('clears the footprint edge by 6-10m — reads as parked beside, not touching the shadow', () => {
    // Destination 6: x=-20 (4.2m clearance) read as touching the machine's
    // own shadow at capture distance in hero/cab/rear34. Bound both ways so
    // a future edit cannot silently drift back to "touching" or overshoot
    // into "unrelated vehicle in the distance".
    const clearance = Math.abs(GROUNDCAR_POSITION.x) - OVERALL.width / 2
    expect(clearance).toBeGreaterThanOrEqual(6)
    expect(clearance).toBeLessThanOrEqual(10)
  })
})
