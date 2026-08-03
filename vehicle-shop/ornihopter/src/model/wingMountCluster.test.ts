// vehicle-shop/ornihopter/src/model/wingMountCluster.test.ts
// Round 6a's wing-mount guard. The pre-round WING_ROOTS were 7.4 / 9.0 / 10.6
// / 12.2m aft — four stations at a dead-even 1.6m pitch, which renders as a
// row of eight identical bobbles strung along the deck and reads as decoration
// rather than mechanism.
//
// The kit mounts them as machinery. Wing_support_front.stl (38.72 x 21.55mm)
// and Wing_support_back.stl (36.50 x 20.34mm) are TRANSVERSE frames, each
// symmetric about the craft's centreline, each with FOUR outstretched arms
// ending in clevis forks: two reaching up-and-out to the deck edge, two
// down-and-out to the flank. Two such frames, at two stations, therefore carry
// 2 stations x 2 heights = four roots per side — a 2x2 cluster, exactly what
// docs/dune_ornihopter_kit-2.png shows on the near flank, where two sockets
// sit on the deck-edge shelf and two more on a proud bracket below and aft.
//
// So the assertion is about GAP STRUCTURE, not station values: the four roots
// must fall into two tight groups separated by a much larger gap. Any future
// edit may move the stations; it may not go back to an even spread.

import { describe, it, expect } from 'vitest'
import { WING_ROOTS, WING, HALF_LENGTH } from '../spec'
import { widthFracAt } from './geometry/hullStations'
import { seatForMount } from './geometry/wing/rootPod'

const aftStations = (): number[] =>
  WING_ROOTS.map((r) => r.z + HALF_LENGTH).sort((a, b) => a - b)

describe('the wing roots cluster like mounting hardware, not like a picket fence', () => {
  it('falls into exactly two longitudinal groups', () => {
    const zs = aftStations()
    expect(zs.length).toBe(WING.perSide)
    const gaps = zs.slice(1).map((z, i) => z - zs[i])
    console.log(`[mounts] stations ${zs.map((z) => z.toFixed(2)).join(' / ')}m aft, gaps ${gaps.map((g) => g.toFixed(2)).join(' / ')}m`)
    // The row gap has to dominate, or "two clusters" is just a claim. Indexed
    // rather than filtered by value: three EQUAL gaps (the pre-round table's
    // 1.60 / 1.60 / 1.60) filter down to an empty "others" list and vacuously
    // pass, which is the defect this test exists to catch.
    let widest = 0
    for (let i = 1; i < gaps.length; i++) if (gaps[i] > gaps[widest]) widest = i
    // An absolute floor as well as a ratio: with two frames the within-cluster
    // gaps are 0.00m, and 3 x 0 is satisfied by anything at all. The row gap
    // is a measured number (PROVENANCE.wingRoots, 5.30m) and this is the
    // structural half of it — two groups, genuinely far apart.
    expect(gaps[widest]).toBeGreaterThanOrEqual(2.5)
    for (let i = 0; i < gaps.length; i++) {
      if (i === widest) continue
      expect(gaps[widest]).toBeGreaterThanOrEqual(Math.max(3 * gaps[i], 2.5))
    }
  })

  it('puts both clusters on the shoulder, where the kit frames bolt through', () => {
    for (const z of aftStations()) {
      const frac = widthFracAt(z)
      expect(frac).toBeGreaterThanOrEqual(0.8)
    }
  })

  it('gives each cluster an upper and a lower root, per the frames four arms', () => {
    // Two arms per side per frame: one to the deck edge, one to the flank.
    // Measured through the real hull surface (rootPod.ts's seatOnHull) rather
    // than off the authored y, because seatOnHull is what actually places the
    // pods and the wing pivots.
    const byStation = new Map<string, number[]>()
    for (const mount of WING_ROOTS) {
      const key = (mount.z + HALF_LENGTH).toFixed(2)
      const seat = seatForMount(mount)
      byStation.set(key, [...(byStation.get(key) ?? []), seat.y])
    }
    console.log(
      `[mounts] per station: ` +
      [...byStation].map(([k, ys]) => `${k}m -> y ${ys.map((y) => y.toFixed(2)).join(', ')}`).join(' | '),
    )
    expect(byStation.size).toBe(2)
    for (const [, ys] of byStation) {
      expect(ys.length).toBe(2)
      expect(Math.abs(ys[0] - ys[1])).toBeGreaterThan(0.35)
    }
  })

  it('sets the forward cluster on the deck edge and the aft cluster lower', () => {
    // kit-dossier.md section e and the kit-2 photograph: the forward frame's
    // arms reach the raised dorsal shelf; the aft frame's sit lower on the
    // flank.
    const zs = aftStations()
    const mean = (aft: number): number => {
      const ys = WING_ROOTS.filter((r) => Math.abs(r.z + HALF_LENGTH - aft) < 1e-6)
        .map((r) => seatForMount(r).y)
      return ys.reduce((a, b) => a + b, 0) / ys.length
    }
    const forward = mean(zs[0])
    const aft = mean(zs[zs.length - 1])
    console.log(`[mounts] forward cluster mean y ${forward.toFixed(2)}m, aft ${aft.toFixed(2)}m`)
    expect(forward).toBeGreaterThan(aft)
  })
})
