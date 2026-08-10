// landscape-shop/sietch/src/model/vaultScale.ts
// R1 critic finding: "the vault is a perfectly uniform extrusion for
// 48m... reads as underground bunker as readily as carved cave hall."
// This is the fix: the vault cross-section is NOT constant along depth —
// it swells to full size mid-hall (the round communal chamber) and eases
// down to a lower "shoulder" approaching the back wall, with a gentler
// taper approaching the mouth. Smooth (no small-scale noise, R1 bar) and
// its PEAK is exactly 1.0, so the swept envelope still touches
// FOOTPRINT's width/height exactly — seam.test.ts measures the actual
// geometry, never assumes a constant.

import { FOOTPRINT } from '../spec'

const PEAK_T = 0.55 // fraction of depth from the back wall (t=0) to the mouth (t=1)
const BACK_SHOULDER = 0.8 // scale at the back wall
const MOUTH_TAPER = 0.92 // scale at the mouth

function ease(frac: number): number {
  return (1 - Math.cos(frac * Math.PI)) / 2
}

/**
 * 1.0 at the swell (PEAK_T of the way from the back wall to the mouth),
 * tapering to BACK_SHOULDER at z = 0 (the back wall) and MOUTH_TAPER at
 * z = -FOOTPRINT.depthM (the mouth). Every caller sweeping the hall along
 * z multiplies both halfWidth and heightM by this at each ring, so the
 * arch shape (crossSection.ts) stays self-similar — a size change, not a
 * different shape.
 */
export function vaultScaleAt(z: number): number {
  const t = Math.min(1, Math.max(0, -z / FOOTPRINT.depthM))
  if (t <= PEAK_T) {
    return BACK_SHOULDER + (1 - BACK_SHOULDER) * ease(t / PEAK_T)
  }
  const frac = (t - PEAK_T) / (1 - PEAK_T)
  return 1 + (MOUTH_TAPER - 1) * ease(frac)
}
