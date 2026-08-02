// vehicle-shop/ornihopter/src/model/geometry/wing/rootArm.test.ts
// The wing's root ARM, measured off the emitted geometry.
//
// Two independent critics said the same thing about the rendered wings: "a
// flat dark strap leaving the ball at near-full chord" — no rod, no sleeve,
// no hinge eye. docs/profiles/kit-dossier.md section f measured the real part
// off the kit plate and it is nothing like a strap:
//
//   hinge eye        x = 0-9mm      annular pivot loop
//   rod / sleeve     x = 10-27mm    tapers to 2.48mm, ~16-18 regular scallops
//   flare into blade x = 28-41mm    chord climbs 2.9mm -> 9.4mm
//   full blade chord x >= 40.7mm    stable
//
// over a 197.62mm span: the sleeve zone is 5-13.7% of span and the thin waist
// is 26% of blade chord. spec.ts's WING.rootArmFraction (0.17) has recorded
// that proportion since round 3; the geometry never honoured it.
//
// Every assertion below reads the real BufferGeometry and derives its own
// station layout from the vertex X values, so it measures the SHAPE and stays
// true across any change to how many points per station the loft emits. That
// matters: the wing tests that missed the inverted winding all measured what
// the builder happened to emit rather than what the part has to look like.

import { describe, it, expect } from 'vitest'
import { buildWingBladeGeometry } from '../wingGeometry'
import { WING, WING_MAX_CHORD } from '../../../spec'

interface Station {
  span: number
  /** Chordwise extent (Z) of the section — what a top view reads as width. */
  width: number
  /** Thickness-wise extent (Y) — what makes a rod a rod and not a strap. */
  thickness: number
  /** Distinct Y values on the upper half, front to back, for section form. */
  upper: { z: number; y: number }[]
}

/** Every emitted station of one blade, grouped by span, layout-agnostic. */
function stationsOf(side: 'left' | 'right'): Station[] {
  const geometry = buildWingBladeGeometry(side, WING.reach)
  const position = geometry.attributes.position
  const groups = new Map<string, { z: number; y: number }[]>()
  for (let i = 0; i < position.count; i++) {
    const span = Math.abs(position.getX(i)) / WING.reach
    const key = span.toFixed(5)
    const list = groups.get(key) ?? []
    list.push({ z: position.getZ(i), y: position.getY(i) })
    groups.set(key, list)
  }
  geometry.dispose()
  return [...groups.entries()]
    .map(([key, points]) => {
      const ys = points.map((p) => p.y)
      const zs = points.map((p) => p.z)
      return {
        span: Number(key),
        width: Math.max(...zs) - Math.min(...zs),
        thickness: Math.max(...ys) - Math.min(...ys),
        upper: points.filter((p) => p.y > 0).sort((a, b) => a.z - b.z),
      }
    })
    .sort((a, b) => a.span - b.span)
}

const LEFT = stationsOf('left')
const RIGHT = stationsOf('right')
const inZone = (from: number, to: number) => LEFT.filter((s) => s.span >= from && s.span <= to)

/** Widths at the dossier's own zone boundaries, as fractions of max chord. */
function widthAt(span: number): number {
  const sorted = LEFT
  let best = sorted[0]
  for (const s of sorted) if (Math.abs(s.span - span) < Math.abs(best.span - span)) best = s
  return best.width / WING_MAX_CHORD
}

describe('wing root arm anatomy (kit-dossier section f)', () => {
  it('is a ROD in section through the sleeve zone, not a flat strap', () => {
    // Dossier: rod/sleeve runs x=10-27mm of 197.62mm, i.e. span 0.051-0.137.
    // The discriminator is NOT width alone — the real part is still 26-47% of
    // blade chord wide there, which a flat ribbon can also be. It is that the
    // part is round: 2.48mm across against a 2.02mm-thick plate. A strap is
    // four times wider than it is deep and shades as one flat face.
    const zone = inZone(0.05, 0.137)
    expect(zone.length).toBeGreaterThan(2)
    for (const station of zone) {
      expect(station.width / station.thickness).toBeLessThan(1.8)
      // Envelope guard: never anywhere near the blade's own chord.
      expect(station.width / WING_MAX_CHORD).toBeLessThan(0.55)
    }
  })

  it('necks down to the measured waist before it flares', () => {
    // Dossier: 2.48mm root width at x=26.81mm against a 9.43mm blade chord —
    // 26%, at 13.6% of span. wing-planform.json agrees in ratio (0.263 of a
    // 0.987 blade chord at span 0.135); the two disagree only on absolute
    // millimetres, and this is a shape test, so the ratio is what it asserts.
    const waist = Math.min(...inZone(0.1, 0.145).map((s) => s.width))
    expect(waist / WING_MAX_CHORD).toBeLessThan(0.3)
  })

  it('carries a hinge eye at the ball, not a paddle', () => {
    // Dossier: annular pivot loop over x=0-9mm (span < 0.0455). It lives
    // INSIDE the ball housing rootPod.ts draws (BALL_RADIUS = 0.34 of max
    // chord, so 0.68 across), which is why a full-chord section here is what
    // reads as "a strap leaving the ball at near-full chord".
    for (const station of inZone(0.004, 0.03)) {
      expect(station.width / WING_MAX_CHORD).toBeLessThan(0.7)
      expect(station.thickness / station.width).toBeGreaterThan(0.45)
    }
  })

  it('carries a ridged sleeve — several rings, not a smooth taper', () => {
    // "~16-18 regular scallops along both edges" (dossier). Rendered at 23m
    // span a literal 17 would alias to noise; a few shallow rings is the
    // legible equivalent. Three local maxima is the minimum that reads as
    // "ridged" rather than "wobbly".
    const zone = inZone(0.045, 0.14)
    let peaks = 0
    for (let i = 1; i < zone.length - 1; i++) {
      if (zone[i].width > zone[i - 1].width && zone[i].width >= zone[i + 1].width) peaks++
    }
    expect(peaks).toBeGreaterThanOrEqual(3)
  })

  it('does not reach blade chord until past spec.ts WING.rootArmFraction', () => {
    // The spec has said 0.17 since round 3. The dossier's own numbers put the
    // flare's end at 20.6% of span, so at 0.17 the arm should still be well
    // under full blade chord.
    const bladeChord = widthAt(0.5)
    expect(widthAt(WING.rootArmFraction) / bladeChord).toBeLessThan(0.72)
  })

  it('mirrors the arm exactly between the two sides', () => {
    expect(RIGHT.length).toBe(LEFT.length)
    for (let i = 0; i < LEFT.length; i++) {
      expect(RIGHT[i].span).toBeCloseTo(LEFT[i].span, 5)
      expect(RIGHT[i].width).toBeCloseTo(LEFT[i].width, 5)
      expect(RIGHT[i].thickness).toBeCloseTo(LEFT[i].thickness, 5)
    }
  })
})

describe('wing blade section has internal form', () => {
  it('has a scribed centre groove on the upper surface at mid-span', () => {
    // "blades are flat black slabs with zero internal shading" — a flat top
    // face has exactly one plane and one shade. The kit's blade has a raised
    // leading rail and a recessed centre channel (docs/dune_ornihopter_kit-2.png),
    // which under one sun gives the blade three distinct tones across its chord.
    const mid = LEFT.find((s) => Math.abs(s.span - 0.5) < 0.06)
    expect(mid).toBeTruthy()
    const upper = mid!.upper
    expect(upper.length).toBeGreaterThanOrEqual(4)
    // A groove is a local MINIMUM in the upper surface: some interior point
    // sits below the straight line between its chordwise neighbours.
    let deepest = 0
    for (let i = 1; i < upper.length - 1; i++) {
      const span = upper[i + 1].z - upper[i - 1].z
      if (span <= 0) continue
      const t = (upper[i].z - upper[i - 1].z) / span
      const chordLine = upper[i - 1].y + (upper[i + 1].y - upper[i - 1].y) * t
      deepest = Math.max(deepest, chordLine - upper[i].y)
    }
    expect(deepest).toBeGreaterThan(WING.thickness * 0.1)
  })

  it('bevels the leading edge instead of ending it in a square slab', () => {
    // The leading edge should be the THINNEST part of the front half, with the
    // spar crest set back from it — a bevel, not a blunt face.
    const mid = LEFT.find((s) => Math.abs(s.span - 0.5) < 0.06)!
    const front = mid.upper[0]
    const crest = mid.upper.reduce((a, b) => (b.y > a.y ? b : a))
    expect(front.y).toBeLessThan(crest.y * 0.6)
    expect(crest.z).toBeGreaterThan(front.z)
  })
})
