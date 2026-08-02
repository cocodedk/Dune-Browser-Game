// vehicle-shop/ornihopter/src/interior/dialFaces.test.ts
// B3 TRIAGE ROUND: docs/apache-gauntlet.md's B3 line — "luminance > 215 forms
// exactly ONE connected region (the cockpit light)" — was failing at 10
// regions >=12px at pitch 0 and 21 at pitch 12, ALL of them traced by a live
// isolated-pilot capture (flood-filled at Rec.709 luma > 215, same method as
// Round 9f's 9f-l215.mjs) to ONE feature: the standby cluster's four analog
// dials (interior/panelParts.ts's `gauge()`, faced by dialFaces.ts's
// gaugeTexture, lit by materials.ts's dialFaceMaterial). Round 11's new side
// panes were RULED OUT as a cause by the same captures: every flagged bbox
// sat at x=163-342, nowhere near the flank glazing or the forward sky, and
// the sky itself never crossed 215 in either pose (measured, not assumed).
//
// ROOT CAUSE, MEASURED. The MARK texel (needle/ticks/hub) authored at
// [206,200,178] has its own raw luma 199.7 -- under 215 on paper -- but
// dialFaceMaterial's emissiveIntensity 0.28 adds another 0.28x on top of
// EVERY texel unconditionally, and scene lighting (the cabin's flat
// NO_FALLOFF panel wash, interior/lighting.ts) adds roughly another 1.09x
// over the raw albedo by itself. An isolated capture with emissiveIntensity
// forced to 0 still rendered that texel at luma 218 (measured); the emissive
// term alone accounted for 9 of the 10 pitch-0 regions.
//
// THE PROXY, spelled out because a bare "texel < 215" assertion would NOT
// have caught this (199.7 < 215 already, which is exactly how the defect
// shipped unnoticed): texelLuma * (LIGHT_K + emissiveIntensity), with
// LIGHT_K 1.09 measured as above, is this file's stand-in for "what a live
// capture will show" -- the same reasoning hud/palette.ts's luma() and
// symbology.test.ts's <205 ceiling use for HUD ink, extended to cover a lit
// (not merely alpha-blended) material's own emissive term. A 205 ceiling
// keeps the same 10-point margin under B3's 215 line that those files use.
//
// FAIL-FIRST, reproduced by reverting both values: MARK [206,200,178] with
// emissiveIntensity 0.28 scores 273.6 (fails); this file's own numbers score
// 187.9 (passes, ~17 points of headroom). Live re-capture after the fix:
// ZERO regions >=12px at pitch 0 and pitch 12 (was 10 and 21).

import { describe, it, expect } from 'vitest'
import type { DataTexture } from 'three'
import { gaugeTexture, tapeTexture } from './dialFaces'
import { dialFaceMaterial } from './materials'

/** Measured this round (see header): a texel's raw albedo, lit by the cabin's
 *  flat-falloff wash alone with zero emissive, rendered ~1.09x its own raw
 *  Rec.709 luma in an isolated pilot capture. Kept as a named constant so the
 *  provenance travels with the number instead of living only in this comment. */
const MEASURED_LIGHT_K = 1.09
/** B3 says >215 is the failure line; held here at the same 10-point margin
 *  hud/palette.ts and symbology.test.ts already use for the same reason. */
const SAFE_CEILING = 205

function luma([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Every texel a baked face actually contains, RGB only (alpha is always
 *  255 from faceBaker.ts's paintInto). */
function texelsOf(texture: DataTexture): Array<readonly [number, number, number]> {
  const { data } = texture.image as { data: Uint8Array }
  const texels: Array<readonly [number, number, number]> = []
  for (let i = 0; i < data.length; i += 4) texels.push([data[i], data[i + 1], data[i + 2]])
  return texels
}

function maxTexelLuma(texture: DataTexture): number {
  return Math.max(...texelsOf(texture).map(luma))
}

describe('dial/tape faces stay under B3s L215 ceiling once lit (B3)', () => {
  it('the lit-face material does not exceed the measured-safe emissive intensity', () => {
    const material = dialFaceMaterial(gaugeTexture({ needleDeg: 0 }))
    const emissiveIntensity = material.emissiveIntensity
    material.dispose()
    // Regression guard on the intensity ALONE: Round 9b's original 0.28 must
    // never come back even if a future texel change looks innocent.
    expect(emissiveIntensity).toBeLessThanOrEqual(0.12)
  })

  it('every gauge, every needle bearing, stays clear of L215 once lit (measured proxy)', () => {
    // Sweep bearings and the danger sector: the needle line and the tick ring
    // are the brightest texels, and their position on the 64px face changes
    // which texels anti-alias together, so one static bearing is not enough.
    const material = dialFaceMaterial(gaugeTexture({ needleDeg: 0 }))
    const emissiveIntensity = material.emissiveIntensity
    material.dispose()
    const bearings = [0, 40, 95, 180, 260, -55]
    const worst = Math.max(
      ...bearings.map((needleDeg) =>
        maxTexelLuma(gaugeTexture({ needleDeg, dangerFromDeg: 95 }))
      )
    )
    const proxy = worst * (MEASURED_LIGHT_K + emissiveIntensity)
    expect(proxy).toBeLessThan(SAFE_CEILING)
  })

  it('the tape faces (same MARK texel) stay clear of L215 once lit (measured proxy)', () => {
    const material = dialFaceMaterial(tapeTexture(0.5))
    const emissiveIntensity = material.emissiveIntensity
    material.dispose()
    const worst = Math.max(...[0.1, 0.35, 0.5, 0.62, 0.9].map((idx) => maxTexelLuma(tapeTexture(idx))))
    const proxy = worst * (MEASURED_LIGHT_K + emissiveIntensity)
    expect(proxy).toBeLessThan(SAFE_CEILING)
  })
})
