// vehicle-shop/harvester/src/model/materials/weathering.test.ts
// The rest of the correctness bar: grime where dust would settle (low
// surfaces, contact points), a belt that reads used, and no DOM anywhere —
// these all run in vitest's node environment with no canvas and no GL, which
// is the whole reason the maps are DataTextures.

import { describe, it, expect } from 'vitest'
import { sampleAlbedo, sampleRoughness } from './dataTexture'
import { buildBeltWearMap, buildPlateMaps, buildTireMap, PLATE_SIZE_SMALL } from './maps'
import { ACCENT_PLATE, BODY_LOW_PLATE, BODY_PLATE, DARK_PLATE, plateTexel } from './plateTexel'
import { BELT_COLOR, BELT_LINK_TINTS, beltTintIndex, luminance, rgbOf } from './palette'

/** Off the border bands and off the centre join, so these read the vertical
 *  story and nothing else. */
const U_CLEAR = 0.3

function required<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`missing ${what}`)
  return value
}

describe('grime settles low on the surfaces that face sideways', () => {
  const low = buildPlateMaps(BODY_LOW_PLATE, PLATE_SIZE_SMALL)
  const lum = (v: number): number => luminance(sampleAlbedo(low.map, U_CLEAR, v))

  it('darkens monotonically from mid-face down to the bottom edge', () => {
    // v = 1 is the top of a box's side face, v = 0 the bottom (measured, see
    // plateTexel.ts). Read at u = 0.12 and never below v = 0.13, where the
    // face-border distance d is pinned at 0.12 for every sample: the border,
    // scribe and weld terms are then all identically zero and the downward
    // gradient is the ONLY thing that can move the luminance. The dust film
    // is out too — it is a deliberately unordered term, and this is the
    // gradient's test, not its.
    const clean = { ...BODY_LOW_PLATE, dust: 0 }
    const steps = [0.5, 0.4, 0.3, 0.2, 0.13]
    for (let i = 1; i < steps.length; i++) {
      const here = luminance(plateTexel(0.12, steps[i], clean).rgb)
      const above = luminance(plateTexel(0.12, steps[i - 1], clean).rgb)
      expect(here).toBeLessThan(above)
    }
  })

  it('darkens the real built map near the bottom by a visible margin', () => {
    expect(lum(0.08)).toBeLessThan(lum(0.5) * 0.85)
  })

  it('leaves the upper half of the face clean — grime does not climb', () => {
    expect(lum(0.6)).toBeCloseTo(lum(0.75), -1)
    expect(Math.abs(lum(0.6) - lum(0.75))).toBeLessThan(lum(0.6) * 0.12)
  })

  it('is the ONLY body style that does it: the deck has no down', () => {
    // A deck plate's v runs fore-aft, so a downward gradient there would be a
    // longitudinal stain that means nothing. BODY_PLATE has downward = 0.
    expect(BODY_PLATE.downward).toBe(0)
    expect(BODY_LOW_PLATE.downward).toBe(1)
    const a = plateTexel(U_CLEAR, 0.12, BODY_PLATE)
    const b = plateTexel(U_CLEAR, 0.5, BODY_PLATE)
    expect(luminance(a.rgb)).toBeCloseTo(luminance(b.rgb), -1)
  })

  it('reports grimed texels as rougher than clean ones', () => {
    const rough = required(low.roughnessMap, 'roughness map')
    expect(sampleRoughness(rough, U_CLEAR, 0.1)).toBeGreaterThan(sampleRoughness(rough, U_CLEAR, 0.6))
  })
})

describe('the near-black dark tone reads its joints by lightening', () => {
  it('cannot darken further, so the plate border goes UP in luminance', () => {
    // Read at a SIDE border (u = 0.004) at mid height, where the downward
    // grime term is zero: at the bottom border the two terms meet and grime
    // wins, which is right — the bottom of a housing is filthy, not polished.
    const border = plateTexel(0.004, 0.5, DARK_PLATE)
    const face = plateTexel(0.5, 0.5, DARK_PLATE)
    expect(luminance(border.rgb)).toBeGreaterThan(luminance(face.rgb))
  })

  it('still darkens downward, so the two terms do not cancel', () => {
    const lowFace = plateTexel(0.5, 0.14, DARK_PLATE)
    const midFace = plateTexel(0.5, 0.5, DARK_PLATE)
    expect(luminance(lowFace.rgb)).toBeLessThan(luminance(midFace.rgb))
  })
})

describe('the tire carries its dirt at the contact radius', () => {
  const tire = buildTireMap()
  const lum = (v: number): number => luminance(sampleAlbedo(tire.map, 0.4, v))

  it('darkens the crown — LatheGeometry v = 1/3..2/3 — and not the rim seat', () => {
    const crown = lum(0.5)
    expect(crown).toBeLessThan(lum(0.05) * 0.8)
    expect(crown).toBeLessThan(lum(0.95) * 0.8)
    expect(lum(1 / 3)).toBeLessThan(lum(0.05) * 0.85)
    expect(lum(2 / 3)).toBeLessThan(lum(0.05) * 0.85)
  })

  it('is a RING: the same dirt all the way round the wheel', () => {
    const around = [0.05, 0.25, 0.5, 0.75, 0.95].map((u) => luminance(sampleAlbedo(tire.map, u, 0.5)))
    const spread = Math.max(...around) - Math.min(...around)
    expect(spread).toBeLessThan(Math.min(...around) * 0.12)
  })

  it('has no roughness map — a 3 m tire has no room to show one', () => {
    expect(tire.roughnessMap).toBeUndefined()
    expect(tire.textures).toHaveLength(1)
  })
})

describe('the belt reads used, not freshly painted', () => {
  const belt = buildBeltWearMap()

  it('is darker than the raw belt colour everywhere on the plate', () => {
    const raw = luminance(rgbOf(BELT_COLOR))
    for (const [u, v] of [[0.5, 0.5], [0.1, 0.5], [0.5, 0.1], [0.9, 0.9]] as const) {
      expect(luminance(sampleAlbedo(belt.map, u, v))).toBeLessThan(raw)
    }
  })

  it('chews the plate edges, where plates knock against each other', () => {
    expect(luminance(sampleAlbedo(belt.map, 0.5, 0.02)))
      .toBeLessThan(luminance(sampleAlbedo(belt.map, 0.5, 0.5)) * 0.85)
  })

  it('deals its wear tints irregularly, so no four-plate rhythm appears', () => {
    const dealt = Array.from({ length: 24 }, (_, i) => beltTintIndex(i, BELT_LINK_TINTS.length))
    for (const index of dealt) expect(index).toBeGreaterThanOrEqual(0)
    for (const index of dealt) expect(index).toBeLessThan(BELT_LINK_TINTS.length)
    // A strict i % n cycle would repeat every n; this must not.
    const cycle = dealt.slice(0, BELT_LINK_TINTS.length)
    expect(dealt.slice(BELT_LINK_TINTS.length, BELT_LINK_TINTS.length * 2)).not.toEqual(cycle)
    expect(new Set(dealt).size).toBeGreaterThan(1)
  })

  it('deals the same chain every run', () => {
    expect(beltTintIndex(37, 4)).toBe(beltTintIndex(37, 4))
  })
})

describe('every map is built without a DOM', () => {
  it('produces byte-identical buffers on a second build', () => {
    const a = buildPlateMaps(ACCENT_PLATE, 64).map.image.data as Uint8Array
    const b = buildPlateMaps(ACCENT_PLATE, 64).map.image.data as Uint8Array
    expect(Array.from(a)).toEqual(Array.from(b))
  })
})
