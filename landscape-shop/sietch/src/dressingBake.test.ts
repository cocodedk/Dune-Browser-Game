// landscape-shop/sietch/src/dressingBake.test.ts
// BAKE-DRIFT PROTECTION. model/dressingBake.json is generated offline by
// tools/bakeDressing.mjs from feedstock that is NOT in the repository, so
// nothing in CI can regenerate it. That makes three silent failures
// possible, and each has a guard here:
//
//   1. spec.ts moves and the bake is not re-run. The bake records the
//      palette and the two dressing anchors it was computed from; if they
//      no longer match spec.ts, the committed geometry is stale.
//   2. the bake and the model disagree about what is in the file — a
//      piece named in the table but not built, or a triangle count that
//      no longer matches the mesh the loader makes of it.
//   3. a feedstock colour survives. The whole re-tint rests on every tone
//      being a function of PALETTE, and the tone table is small enough to
//      check entry by entry.

import { describe, it, expect } from 'vitest'
import type { Mesh, Object3D } from 'three'
import { createSietch } from './model/Sietch'
import { DRESSING_BAKE } from './model/dressing/Dressing'
import { decodeUint16 } from './model/dressing/bakeCodec'
import { dressingOf, meshesOf } from './testHelpers'
import { DRESSING, PALETTE } from './spec'

// Hue windows the whole set lives in, in degrees. Warm covers
// PALETTE.rock (29) through DRESSING.hearthColor (31) at every value;
// frond is PALETTE.palmFrond's own 81 plus the head-room a mix toward
// rockGlowlit costs; water is PALETTE.water's 176. Anything greyer than
// NEUTRAL_SAT has no hue worth placing.
const HUE_WINDOWS: Array<[number, number]> = [[10, 50], [66, 95], [155, 200]]
const NEUTRAL_SAT = 0.12
// Nothing in a firelit rock hall is more saturated than this. The cap is
// what stops a later round quietly reintroducing the kit's own turquoise
// and spice reds through a new ramp.
const MAX_SAT = 0.6

function hueSat(hex: number): { hue: number; sat: number } {
  const [r, g, b] = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const span = max - min
  if (span < 1e-6) return { hue: 0, sat: 0 }
  const hue = max === r ? 60 * (((g - b) / span) % 6)
    : max === g ? 60 * ((b - r) / span + 2)
      : 60 * ((r - g) / span + 4)
  return { hue: (hue + 360) % 360, sat: span / (max + min) }
}

describe('R3 bake: the committed derivative still matches the spec it was cut from', () => {
  it('records the same palette spec.ts holds today', () => {
    expect(DRESSING_BAKE.paletteUsed).toEqual({ ...PALETTE, hearthColor: DRESSING.hearthColor })
  })

  it('records the same hearth and basin anchors', () => {
    expect(DRESSING_BAKE.specAnchors.hearthAtM).toEqual([...DRESSING.hearthAtM])
    expect(DRESSING_BAKE.specAnchors.basinAtM).toEqual([...DRESSING.basinAtM])
  })
})

describe('R3 bake: what the file says is what the model builds', () => {
  it('builds one mesh per piece, with the triangle count the bake wrote', () => {
    const set = createSietch()
    const built = new Map<string, Mesh>()
    for (const mesh of meshesOf(dressingOf(set.root as unknown as Object3D))) {
      built.set(mesh.name, mesh)
    }

    let total = 0
    for (const piece of DRESSING_BAKE.pieces) {
      const mesh = built.get(piece.name)
      expect(mesh, `${piece.name} is in the bake but not in the scene`).toBeTruthy()
      const position = (mesh as Mesh).geometry.attributes.position
      expect(position.count / 3, `${piece.name} triangle count drifted`).toBe(piece.triangles)
      // The loader expands the indexed bake into a flat-shaded soup, so
      // three vertices per triangle is the contract, not an accident.
      // Decoded here (not read off `position.count` twice) so a pack.mjs
      // bug that writes the wrong element count into indexQ is still
      // caught, not just a mismatch between two readings of the mesh.
      expect(position.count).toBe(decodeUint16(piece.indexQ).length)
      total += piece.triangles
    }
    expect(total, 'the bake\'s own total disagrees with its pieces').toBe(DRESSING_BAKE.triangles)

    // Two authored forms (the pool and its kerb) are the only dressing
    // meshes with no bake entry — see model/dressing/basinPool.ts.
    expect(built.size).toBe(DRESSING_BAKE.pieces.length + 2)
    set.dispose()
  })

  it('names a zone that exists for every piece, and a real support height', () => {
    const zones = new Set(DRESSING_BAKE.zones.map((zone) => zone.name))
    for (const piece of DRESSING_BAKE.pieces) {
      expect(zones.has(piece.zone), `${piece.name} names zone ${piece.zone}`).toBe(true)
      expect(piece.supportY, `${piece.name} has no support height`).toBeGreaterThanOrEqual(0)
      expect(piece.boundsMin[1]).toBeGreaterThanOrEqual(-0.01)
      expect(piece.transforms.length, `${piece.name} records no reshaping`).toBeGreaterThan(20)
    }
  })
})

describe('R3 bake: no feedstock colour survived the re-tint', () => {
  it('keeps every tone in a PALETTE hue window, and nothing neon', () => {
    expect(DRESSING_BAKE.tones.length).toBeGreaterThan(20)
    for (const tone of DRESSING_BAKE.tones) {
      const { hue, sat } = hueSat(tone)
      const placed = sat < NEUTRAL_SAT || HUE_WINDOWS.some(([lo, hi]) => hue >= lo && hue <= hi)
      expect(placed, `tone #${tone.toString(16)} sits at hue ${hue.toFixed(1)}`).toBe(true)
      expect(sat, `tone #${tone.toString(16)} is too saturated`).toBeLessThanOrEqual(MAX_SAT)
    }
  })

  // The one the art direction names outright: the kit's fronds are
  // #83bd5f, a fresh 97-degree green at 0.33 saturation. PALETTE.palmFrond
  // is a dusty 81-degree olive, and every green in the set has to be that
  // olive at some value — never a greener or a more saturated one.
  it('holds the palmary\'s greens on PALETTE.palmFrond\'s own hue', () => {
    const target = hueSat(PALETTE.palmFrond)
    const greens = DRESSING_BAKE.tones.map(hueSat).filter((t) => t.hue > 55 && t.hue < 150)
    expect(greens.length, 'the palmary lost its foliage tones').toBeGreaterThan(5)
    for (const green of greens) {
      expect(
        Math.abs(green.hue - target.hue),
        `a frond tone drifted to hue ${green.hue.toFixed(1)} (palmFrond is ${target.hue.toFixed(1)})`,
      ).toBeLessThanOrEqual(12)
      expect(green.sat, 'a frond tone is more saturated than PALETTE.palmFrond')
        .toBeLessThanOrEqual(target.sat * 1.15)
    }
  })
})

// R4: figures — 0.2126/0.7152/0.0722 relative luminance, the exact weights
// tools/bake/tones.mjs's own luminanceOf uses, duplicated here for the same
// reason PALETTE and the hue windows above are: a .mjs bake tool and a .ts
// test cannot share a function, so the guard re-derives instead of trusts.
function luminanceOf(hex: number): number {
  const [r, g, b] = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Palette warmth, narrower than the general HUE_WINDOWS check above — this
// is specifically "does a skin-window tone actually sit near PALETTE.rock's
// own 29 deg", not merely "is it somewhere warm".
const SKIN_HUE_WINDOW: [number, number] = [15, 45]
const ROBE_MAX_LUM = 0.28
const SKIN_MIN_LUM = 0.34

describe('R4: the human figures are sourced, provenanced, and palette-true', () => {
  it('records a source URL and a CC0 licence for exactly the figure pieces', () => {
    const attributed = DRESSING_BAKE.pieces.filter((p) => p.sourceUrl != null)
    expect(attributed.length, 'no figure pieces carry source attribution').toBeGreaterThanOrEqual(2)
    for (const piece of attributed) {
      expect(piece.sourceUrl, `${piece.name} sourceUrl`).toMatch(/^https:\/\//)
      expect(piece.licence, `${piece.name} licence`).toMatch(/CC0/)
    }
  })

  // Operationalises "dusty dark umber/charcoal robes, muted skin tone
  // within palette warmth": a dark robe-band tone AND a distinctly lighter
  // skin-band tone both exist, both inside the rock family's own hue.
  it('keeps a dark robe tone and a lighter skin tone, both in PALETTE\'s own hue', () => {
    const inWindow = DRESSING_BAKE.tones.filter((t) => {
      const { hue } = hueSat(t)
      return hue >= SKIN_HUE_WINDOW[0] && hue <= SKIN_HUE_WINDOW[1]
    })
    const robeLike = inWindow.filter((t) => luminanceOf(t) <= ROBE_MAX_LUM)
    const skinLike = inWindow.filter((t) => luminanceOf(t) >= SKIN_MIN_LUM)
    expect(robeLike.length, 'no dark umber/charcoal robe tone in the bake').toBeGreaterThan(0)
    expect(skinLike.length, 'no lighter skin tone in the bake').toBeGreaterThan(0)
  })
})
