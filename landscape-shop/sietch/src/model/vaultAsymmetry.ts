// landscape-shop/sietch/src/model/vaultAsymmetry.ts
// Per-z shape variance fed into crossSection.ts's buildVaultProfile so the
// vault reads as carved rock, not a uniform architectural extrusion (R1
// critic, twice, on the previous perfectly-symmetric ellipsoid). Three
// independent effects, all smooth (no per-point noise — R1 bar):
//   - left/right spring heights differ by a fixed amount — a consistently
//     lopsided spring line, not something that averages itself away along
//     the depth.
//   - the crown line drifts a few metres off x = 0 as z sweeps the depth.
//   - a shallow inward dent on the right wall, windowed to one stretch of
//     the hall (an "alcove"), never an outward bulge — it would blow the
//     width guard. crossSection.ts's wallBulgeHump keeps the dent at 0 at
//     both the floor and the spring line, so the wall's own widest point
//     is never touched.

import type { VaultAsymmetry } from './crossSection'

const SPRING_FRAC_LEFT = 0.28
const SPRING_FRAC_RIGHT = 0.40

const CROWN_WANDER_AMPLITUDE_M = 2.4
const CROWN_WANDER_CYCLES = 1.6
const CROWN_WANDER_PHASE = 0.6

const ALCOVE_CENTER_T = 0.55 // fraction of depth from the back wall; mid-hall
const ALCOVE_HALF_WIDTH_T = 0.14
const ALCOVE_DEPTH_M = 1.1

/** Quartic falloff window, 1 at the centre, 0 at +-halfWidth. */
function alcoveWindow(t: number): number {
  const d = Math.abs(t - ALCOVE_CENTER_T)
  if (d >= ALCOVE_HALF_WIDTH_T) return 0
  const x = d / ALCOVE_HALF_WIDTH_T
  return (1 - x * x) * (1 - x * x)
}

/**
 * @param z       Depth coordinate (0 at the back wall, negative toward
 *   the mouth — the repo-wide -Z-front convention).
 * @param depthM  FOOTPRINT.depthM, normalising z into a 0..1 fraction.
 */
export function vaultAsymmetryAt(z: number, depthM: number): VaultAsymmetry {
  const t = Math.min(1, Math.max(0, -z / depthM))
  const crownOffsetM = CROWN_WANDER_AMPLITUDE_M *
    Math.sin(t * Math.PI * CROWN_WANDER_CYCLES + CROWN_WANDER_PHASE)
  const bulgeAmountM = ALCOVE_DEPTH_M * alcoveWindow(t)
  return {
    springFracLeft: SPRING_FRAC_LEFT,
    springFracRight: SPRING_FRAC_RIGHT,
    crownOffsetM,
    bulgeAmountM,
  }
}
