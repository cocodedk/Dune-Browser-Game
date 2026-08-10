// landscape-shop/cliff/src/weatherR2.test.ts
// R2 WEATHER guards: wind, varnish, sand, rockfall scars, and the gate's own
// read. Each one pins a NAMED form to a number a later round cannot quietly
// erase — the point of the round is that the surface is authored, not noise,
// and noise passes no directional test.
//
// Measured off built vertex colours only (see strataR2.test.ts's header).

import { describe, it, expect } from 'vitest'
import type { Object3D } from 'three'
import { createCliff } from './model/Cliff'
import { MASSIF_BAKE } from './model/massif'
import { beddingHeightAt, COURSE_M } from './model/strata'
import { SCARS } from './model/scars'
import { WIND, fluteGrooveAt } from './model/weathering'
import { paintedSamples, average, interiorSamples, type PaintedSample } from './testHelpers'

const facing = (s: PaintedSample): number => s.nx * WIND.x + s.ny * WIND.y + s.nz * WIND.z

function litRock(root: Object3D): PaintedSample[] {
  return [
    ...paintedSamples(root, 'massif', true),
    ...paintedSamples(root, 'gateWall'),
    ...paintedSamples(root, 'skirtRock'),
    ...paintedSamples(root, 'sandApron'),
  ]
}

describe('R2: the wind has a direction and the rock records it', () => {
  it('windward faces are bleached and lee faces are darker', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massif = paintedSamples(root, 'massif', true)
    const windward = massif.filter((s) => facing(s) < -0.7).map((s) => s.luminance)
    const lee = massif.filter((s) => facing(s) > 0.7).map((s) => s.luminance)
    expect(windward.length).toBeGreaterThan(300)
    expect(lee.length).toBeGreaterThan(300)
    // Measured 1.16. A surface with no wind story scores 1.00.
    expect(average(windward) / average(lee)).toBeGreaterThan(1.08)
    set.dispose()
  })

  it('varnish streaks run down the flute grooves, not across them', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massif = paintedSamples(root, 'massif', true)
    // Paired inside one mass AND one bed, so the comparison cannot be won or
    // lost by the bands: only the groove/rib difference is left.
    const gaps: number[] = []
    for (const mass of MASSIF_BAKE.strata) {
      const plane = mass.plane as [number, number, number, number]
      const beds = new Map<number, PaintedSample[]>()
      for (const face of massif.slice(mass.from, mass.to)) {
        if (face.nz > -0.25 || face.y < 70) continue
        const bed = Math.floor(beddingHeightAt(plane, face.x, face.y, face.z) / COURSE_M)
        const held = beds.get(bed)
        if (held) held.push(face)
        else beds.set(bed, [face])
      }
      for (const rows of beds.values()) {
        const groove = rows.filter((s) => fluteGrooveAt(s) > 0.7).map((s) => s.luminance)
        const rib = rows.filter((s) => fluteGrooveAt(s) < 0.3).map((s) => s.luminance)
        if (groove.length >= 2 && rib.length >= 2) gaps.push(average(rib) - average(groove))
      }
    }
    expect(gaps.length).toBeGreaterThanOrEqual(10)
    // R2.1 measured +0.083 mean, 94% of beds darker in the groove — the
    // shaped flute field and the widened varnish value. R2 carried 0.015/0.7.
    expect(average(gaps)).toBeGreaterThan(0.05)
    expect(gaps.filter((gap) => gap > 0).length / gaps.length).toBeGreaterThan(0.85)
    set.dispose()
  })
})

describe('R2: varnish on the crests, sand at the foot', () => {
  it('high up-facing rock is varnish-dark against sand-pale ledges below', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const massif = paintedSamples(root, 'massif', true)
    const crest = massif.filter((s) => s.ny > 0.6 && s.y > 140).map((s) => s.luminance)
    const foot = massif.filter((s) => s.ny > 0.6 && s.y > 0 && s.y < 30).map((s) => s.luminance)
    expect(crest.length).toBeGreaterThan(30)
    expect(foot.length).toBeGreaterThan(300)
    // R2.1 measured 1.92 (R2: 1.44). Flat rock with no varnish and no ledge
    // dust scores 1.00.
    expect(average(foot) / average(crest)).toBeGreaterThan(1.6)
    set.dispose()
  })

  // R2.1 RESTATED this guard. R2 asked for a strictly brighter reading at
  // every step down a five-band ladder, and that is a property no strongly
  // bedded cliff can have: the bands here are 16 to 40 m and a member is
  // 28.5 m, so one alternation of model/rockRamp.ts's pale-and-iron sequence
  // aliases straight onto the ladder and decides its own ordering. Measured
  // after the amplification: 0.42, 0.37, 0.65, 0.57, 0.60 — the base IS the
  // desert-blended end, but a chalk member sits at the foot of the wall and
  // outranks the drift below it. So the SAND LEAN, which no member can
  // reorder because every member is the same hue family, now carries the
  // strict ladder (it did not have to before), and the luminance claim is
  // made where it is real: the buried foot against the weathered wall.
  it('the base blends into the desert: colour warms all the way down, and lightens', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const rock = litRock(root)
    const bands: Array<[number, number]> = [[40, 80], [18, 40], [2, 18], [-14, 2], [-40, -14]]
    const readings = bands.map(([low, high]) => {
      const rows = rock.filter((s) => s.y >= low && s.y < high)
      expect(rows.length).toBeGreaterThan(200)
      return {
        luminance: average(rows.map((s) => s.luminance)),
        sandLean: average(rows.map((s) => s.r - s.b)),
      }
    })
    // Warmer at every step down, without exception: red pulls away from blue
    // as the drift takes over. Measured 51.9, 56.2, 58.5, 74.8, 82.5.
    for (let i = 1; i < readings.length; i++) {
      expect(readings[i].sandLean).toBeGreaterThan(readings[i - 1].sandLean)
    }
    // R2 asked only that the ends be 20 apart; measured 30.6, guarded at 28.
    expect(readings[readings.length - 1].sandLean - readings[0].sandLean).toBeGreaterThan(28)
    // And lighter: the two buried bands against the two weathered ones.
    // Measured 1.25. It is a smaller margin than R2's surface managed, and
    // for a reason worth writing down: the wall itself now carries chalk
    // members, so "the base is the light end" is a claim about the drift
    // beating weathered rock, not about beating brown rock.
    const buried = average(readings.slice(3).map((r) => r.luminance))
    const wall = average(readings.slice(0, 2).map((r) => r.luminance))
    expect(buried / wall).toBeGreaterThan(1.2)
    set.dispose()
  })
})

describe('R2: every rockfall scar has its block lying under it', () => {
  it('each scar sits over the debris mass it came off', () => {
    expect(SCARS.length).toBe(3)
    for (const scar of SCARS) {
      const block = MASSIF_BAKE.hierarchy.find((mass) => mass.name === scar.name)
      if (!block) throw new Error(`${scar.name} left the bake`)
      // The scar's span must lie over the block's, and the block must lie
      // BELOW the scar: a scar above, its debris below, is the whole story.
      expect(scar.centreX - scar.halfWidth).toBeLessThan(block.max[0])
      expect(scar.centreX + scar.halfWidth).toBeGreaterThan(block.min[0])
      expect(scar.bottomY).toBeGreaterThanOrEqual(block.max[1])
    }
  })

  it('each scar is measurably fresher rock than the wall around it', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const rock = litRock(root).filter((s) => s.nz < -0.2)
    for (const scar of SCARS) {
      const span = scar.topY - scar.bottomY
      const inside = rock.filter((s) => Math.abs(s.x - scar.centreX) < scar.halfWidth * 0.75
        && s.y > scar.bottomY + span * 0.15 && s.y < scar.bottomY + span * 0.85)
      const beside = rock.filter((s) => {
        const away = Math.abs(s.x - scar.centreX)
        return away > scar.halfWidth * 1.6 && away < scar.halfWidth * 3.5
          && s.y > scar.bottomY && s.y < scar.topY
      })
      expect(inside.length).toBeGreaterThan(12)
      expect(beside.length).toBeGreaterThan(50)
      // R2.1 measured 1.23, 1.55, 1.66 across the three (R2: 1.22 to 1.34).
      const contrast = average(inside.map((s) => s.luminance)) / average(beside.map((s) => s.luminance))
      expect(contrast).toBeGreaterThan(1.2)
    }
    set.dispose()
  })
})

describe('R2: the gate reads as a carved mouth, not a cutout', () => {
  it('the sill zone is warm sand-bounce, not scaled-up grey', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    for (const name of ['gateChamfer', 'gateJamb']) {
      const low = paintedSamples(root, name).filter((s) => s.y >= -4 && s.y <= 6)
      expect(low.length).toBeGreaterThan(20)
      // Reflected desert, measured at 2.6 red to blue. Rock lit by nothing in
      // particular sits near 1.5, which is what read as a black cutout.
      expect(average(low.map((s) => s.r)) / average(low.map((s) => s.b))).toBeGreaterThan(2.3)
    }
    set.dispose()
  })

  it('the shaft has a lit floor under a dark roof — the depth cue', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const interior = interiorSamples(root)
    const sill = average(interior.filter((s) => s.y >= -4 && s.y <= 1).map((s) => s.luminance))
    const roof = average(interior.filter((s) => s.y >= 12).map((s) => s.luminance))
    // R2.1 measured 4.96 (R2: 2.93). massingR1.test.ts caps the absolute
    // values; this pins the RATIO, which is what a person reads as depth.
    expect(sill / roof).toBeGreaterThan(4.5)
    set.dispose()
  })
})
