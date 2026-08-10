// landscape-shop/sietch/src/model/surface/smoke.ts
// THE PLUME. A hearth that has burned for generations stains the roof
// above it, and the stain is the single strongest piece of evidence in
// the room that people live here. It is authored as one plume ANCHORED TO
// DRESSING.hearthAtM — move the hearth in spec.ts and the stain moves
// with it, because every number below is measured from that point. It is
// never sprayed over the vault.
//
// Which way it leans is a decision, and it is this one: TOWARD THE BACK
// WALL. The mouth is where cold air comes in; the galleries cut through
// the back wall are where it leaves. They are the flue, so the column
// leans back toward them as it climbs, and the pool under the vault is
// drawn out in that direction. That is also the half of the vault
// CAMERA_RIG can see: measured, the crown directly over the hearth sits
// about 48 degrees above the rig's axis and the frame stops at 31, so a
// plume that only touched rock straight above the fire would stain
// nothing the player ever looks at.
//
// Two parts, taken as a maximum, never summed:
//   COLUMN  the rising trunk. Only stains rock it actually meets, which
//           on the side walls is nothing — a column in the middle of a
//           36 m hall touches no wall, and pretending otherwise is how a
//           stain turns into a spray.
//   POOL    what the smoke does once it hits the roof: spreads flat and
//           wide under the vault, elongated toward the flue, and only on
//           surfaces high enough to count as roof.

import { DRESSING, FOOTPRINT } from '../../spec'
import { clamp01, smoothstep } from './curves'

const [HEARTH_X, , HEARTH_Z] = DRESSING.hearthAtM

const RISE_LO_Y_M = 2.4
const RISE_HI_Y_M = 6.0

/** How far back toward the flue the column has leaned by the vault. */
const LEAN_Z_M = 11.5
/**
 * And how far across. R2.1 SIGN FIX, and it is the whole of the critic's
 * third finding: "the dark zone sits centered top-of-vault regardless of
 * the firepit's off-center position — reads as plain light falloff."
 * R2 wrote +2.2 under the comment "the galleries sit left of centre and
 * pull with them" — but the galleries are at x = -11 and -5.5 and the
 * hearth is at x = -6, so +2.2 pulled the plume toward x = -3.8, which is
 * the CENTRELINE. The lean was dragging the stain to exactly the place
 * that made it unreadable as a stain. It now leans to the mean of the two
 * flue openings, x = -8.25.
 */
const LEAN_X_M = -3.2

const COLUMN_RADIUS_LO_M = 1.9
const COLUMN_RADIUS_HI_M = 4.2

/** The footprint of the pool under the roof, measured from the point the
 *  column meets it. Longer along the hall than across it — the draught
 *  has a direction. */
const POOL_HALF_X_M = 8.5
const POOL_HALF_Z_M = 11.0
/** How much further it reaches toward the flue than away from it. */
const POOL_FLUE_STRETCH = 1.5
/** And how much SHORTER toward the mouth. R2's pool was 27 m across a
 *  36 m hall and 27 m along a stretch of vault the rig can see all of —
 *  wide enough that wherever its centre sat, what the frame showed was a
 *  dark crown. The half the cold draught comes from now stays clean, so
 *  the stain has an edge the eye can place against the fire. */
const POOL_MOUTH_SHRINK = 0.62

/** Only rock this high off the floor counts as roof. */
const ROOF_LO_FRAC = 0.35
const ROOF_HI_FRAC = 0.66

const TONGUES = 3
const TONGUE_DEPTH = 0.2
const TONGUE_PHASE = 0.7

const MAX_STAIN = 0.95

/** Where the column's axis is at height y. */
export function plumeAxisAt(y: number): [number, number] {
  const climb = clamp01(y / FOOTPRINT.heightM)
  return [
    HEARTH_X + LEAN_X_M * Math.pow(climb, 1.5),
    HEARTH_Z + LEAN_Z_M * Math.pow(climb, 1.25),
  ]
}

/** Where the column meets the roof — the centre of the pool. */
export const POOL_CENTRE: [number, number] = plumeAxisAt(FOOTPRINT.heightM)

function columnStainAt(x: number, y: number, z: number): number {
  const [ax, az] = plumeAxisAt(y)
  const climb = clamp01(y / FOOTPRINT.heightM)
  const radius = COLUMN_RADIUS_LO_M + (COLUMN_RADIUS_HI_M - COLUMN_RADIUS_LO_M) * Math.pow(climb, 0.75)
  const distance = Math.hypot(x - ax, z - az)
  const tongues = 1 + TONGUE_DEPTH * Math.cos(TONGUES * Math.atan2(z - az, x - ax) + TONGUE_PHASE)
  return clamp01(1 - Math.pow(distance / (radius * tongues), 1.8))
}

function poolStainAt(x: number, y: number, z: number): number {
  const roof = smoothstep(ROOF_LO_FRAC * FOOTPRINT.heightM, ROOF_HI_FRAC * FOOTPRINT.heightM, y)
  if (roof <= 0) return 0
  const dz = z - POOL_CENTRE[1]
  const halfZ = POOL_HALF_Z_M * (dz > 0 ? POOL_FLUE_STRETCH : POOL_MOUTH_SHRINK)
  const nx = (x - POOL_CENTRE[0]) / POOL_HALF_X_M
  const nz = dz / halfZ
  const angle = Math.atan2(nz, nx)
  const tongues = 1 + TONGUE_DEPTH * Math.cos(TONGUES * angle + TONGUE_PHASE)
  return roof * clamp01(1 - Math.pow(Math.hypot(nx, nz) / tongues, 1.6))
}

/**
 * 0 (clean rock) to MAX_STAIN (deepest soot) at a world point.
 * Pure function of the spec's hearth position and the constants above —
 * surface.test.ts measures the baked map against it.
 */
export function smokeStainAt(x: number, y: number, z: number): number {
  const rise = smoothstep(RISE_LO_Y_M, RISE_HI_Y_M, y)
  if (rise <= 0) return 0
  return MAX_STAIN * rise * Math.max(columnStainAt(x, y, z), poolStainAt(x, y, z))
}
