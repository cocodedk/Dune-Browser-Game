// landscape-shop/sietch/src/model/surface/carvedProfile.ts
// THE ONE PLACE THE HALL'S SURFACE IS DECIDED. envelope.ts, backWall.ts
// and entrance.ts all sweep this function, so the tube, the back-wall cap
// outline and the mouth collar can never disagree about where the rock
// is — the class of mismatch two R1 critics read as "a stray hairline".
//
// It takes crossSection.ts's smooth R1 profile and pushes each point
// INWARD along the profile's own 2D normal by the sum of the three named
// carving families:
//   bedding.ts    — hard courses standing proud, at constant world Y
//   carveSweep.ts — overlap ridges between blade sweeps, on the vault
//   leftBlocks.ts — unquarried blocks, on the walls, different per side
//
// MASSING IS INVARIANT BY CONSTRUCTION, two ways:
//   1. Displacement is inward-only (>= 0 along the inward normal), so no
//      point can ever push the footprint outward.
//   2. protectionGate() drives it to exactly 0 at the four vertices the
//      seam suite measures the footprint from — the two floor corners and
//      the two spring points, which are the profile's widest — and ramps
//      it in over the next two indices, so there is no crease either.
// The crown (the tallest point) is protected differently: bedding stops
// below BEDDED_TOP_Y_M and carveSweep leaves CROWN_CLEAR_T unscored, so
// nothing displaces the vault where it reaches its spec'd height.

import {
  buildVaultProfile, SPRING_LEFT_INDEX, SPRING_RIGHT_INDEX, PROFILE_POINT_COUNT,
  type Point2,
} from '../crossSection'
import { vaultScaleAt } from '../vaultScale'
import { vaultAsymmetryAt } from '../vaultAsymmetry'
import { FOOTPRINT } from '../../spec'
import { bedProudAt, beddingLiftAt } from './bedding'
import { chatterProudAt, ridgeProudAt } from './carveSweep'
import { blockProudAt } from './leftBlocks'
import { wallSampleYs } from '../wallSampling'
import { clamp01, smoothstep } from './curves'

// 0.5 m between rings. Chosen so a ring lands EXACTLY on z = -4 (the
// back-wall cap plane, r = 8) and z = -50 (the mouth collar's inner ring,
// r = 100): a cap evaluated at a depth the tube only interpolates through
// would sit a centimetre off the tube once the profile is displaced, and
// a centimetre is a hairline at the rig's grazing angle.
//
// R2.1: 79 -> 105 (0.667 -> 0.5 m). carveSweep.ts's new table has ridges
// as narrow as halfT = 0.022, which is 2.3 m of hall; at 0.667 m rings a
// band that narrow was resolved by three vertices and came out as a
// rounded swell rather than a band with two edges. entrance.ts's
// COLLAR_RINGS moves with this — the collar and the envelope overlap and
// only stay out of each other's z-fight by sharing exact ring depths.
export const RING_COUNT = 105

const PROTECT_RADIUS = 1
const PROTECT_RAMP = 2

export interface CarvedRing {
  points: Point2[]
  /** Arc length along the ring, normalised 0 (left floor corner) to 1
   *  (right floor corner) — the shell's U texture coordinate. */
  u: number[]
  z: number
}

/** 0 at the vertices seam.test.ts measures the footprint from, 1 once
 *  clear of them. */
export function protectionGate(index: number): number {
  const anchors = [0, SPRING_LEFT_INDEX, SPRING_RIGHT_INDEX, PROFILE_POINT_COUNT - 1]
  let nearest = Infinity
  for (const a of anchors) nearest = Math.min(nearest, Math.abs(index - a))
  return clamp01((nearest - PROTECT_RADIUS) / PROTECT_RAMP)
}

/** Inward-pointing unit normal of the profile polyline at `index`. */
function inwardNormal(points: Point2[], index: number): Point2 {
  const prev = points[Math.max(0, index - 1)]
  const next = points[Math.min(points.length - 1, index + 1)]
  const tx = next.x - prev.x
  const ty = next.y - prev.y
  const len = Math.hypot(tx, ty) || 1
  // Rotating the tangent by -90 degrees points into the hall everywhere
  // along this profile's left-to-right winding.
  return { x: ty / len, y: -tx / len }
}

// THE VAULT WAS SWEPT, THE WALLS WERE QUARRIED — and above the springing
// the sweep won. This is a measured limit as much as a story. The walls
// place a vertex on every course boundary they carry (wallSampling.ts);
// the arch cannot, because it is parametrised by ANGLE and its samples
// are 0.4 m of rise apart at the springing and 1 m higher up. A 0.78 m
// course with a 0.12 m riser at that sampling is one quad wide, and
// R2.1's first shot showed exactly that — rows of isolated bright shards
// jutting off the vault where a deep course crossed it.
//
// So the courses belong to the walls, and they are already gone by the
// time the rock turns the corner: the relief fades out over the last
// SPRING_FADE_M below the spring line, and there is none above it.
//
// The fade is not only about the arch. wallSampling.ts has to CLAMP any
// course boundary that the swell has lifted above this ring's own
// springing, which stacks several vertices on the spring line; carrying
// full relief, that stack fanned out into a stepped black edge running
// down the hall (seen in rig.png, chased through the ridges and the arch
// before it was found here). Fading the relief to zero before the clamp
// can bite leaves the stack flat, where it draws nothing. sample.ts
// fades the bed TONE across the same band so the paint agrees.
export const SPRING_FADE_M = 0.55

/** Height of the springing on the side of the hall this x is on. The one
 *  number both the geometry and sample.ts's tone measure the courses'
 *  hand-over to the swept vault from. */
export function springHeightAt(z: number, x: number): number {
  const asymmetry = vaultAsymmetryAt(z, FOOTPRINT.depthM)
  return FOOTPRINT.heightM * vaultScaleAt(z) *
    (x < 0 ? asymmetry.springFracLeft : asymmetry.springFracRight)
}

/** Where a point sits along the arch: 0 at the LEFT springing, 1 at the
 *  right. carveSweep.ts's ridges use it to die out before they reach a
 *  springing, which is what stopped the vault reading as a ribbed tube. */
export function archFractionOf(index: number): number {
  const span = SPRING_RIGHT_INDEX - SPRING_LEFT_INDEX
  return clamp01((index - SPRING_LEFT_INDEX) / (span || 1))
}

/**
 * Metres this profile point stands proud of the nominal surface. Never
 * negative — the invariant the whole massing guarantee rests on.
 */
export function proudAt(index: number, point: Point2, t: number): number {
  const onArch = index > SPRING_LEFT_INDEX && index < SPRING_RIGHT_INDEX
  const side: -1 | 1 = index <= SPRING_LEFT_INDEX ? -1 : 1
  const z = -t * FOOTPRINT.depthM
  const lift = beddingLiftAt(point.x, z, FOOTPRINT.depthM)
  const a = archFractionOf(index)
  // EVERYTHING THE WALL CARRIES HANDS OVER AT THE SPRINGING — the courses
  // and the unquarried blocks alike. The fade covers both because
  // wallSampling.ts stacks its top vertices on the spring line whenever
  // the swell has lifted a boundary above this ring's own wall, and any
  // relief left on that stack fans it out into a row of teeth along the
  // springing. Measured by isolation: with the vault's own families
  // switched off the teeth stayed, which is what pointed at the blocks.
  const spring = springHeightAt(z, point.x)
  const wallFade = 1 - smoothstep(spring - SPRING_FADE_M, spring, point.y)
  const family = onArch
    ? ridgeProudAt(t, a) + chatterProudAt(t)
    : (bedProudAt(point.y, lift, t) + blockProudAt(side, t, point.y)) * wallFade
  return family * protectionGate(index)
}

/** The carved cross-section at depth z, plus its own arc-length U. */
export function carvedRingAt(z: number): CarvedRing {
  const scale = vaultScaleAt(z)
  const asymmetry = vaultAsymmetryAt(z, FOOTPRINT.depthM)
  const halfWidth = (FOOTPRINT.widthM / 2) * scale
  const crownY = FOOTPRINT.heightM * scale
  // Each wall is sampled where ITS OWN courses are: the bedding lift is a
  // single number per wall per ring (the dip is a function of x, and a
  // wall's x is fixed), so wallSampling.ts can put a vertex pair on every
  // boundary. This is what stops a course edge staircasing down the hall.
  const base = buildVaultProfile(halfWidth, crownY, asymmetry, {
    left: wallSampleYs(crownY * asymmetry.springFracLeft, beddingLiftAt(-halfWidth, z, FOOTPRINT.depthM)),
    right: wallSampleYs(crownY * asymmetry.springFracRight, beddingLiftAt(halfWidth, z, FOOTPRINT.depthM)),
  })
  const t = Math.min(1, Math.max(0, -z / FOOTPRINT.depthM))

  const points: Point2[] = []
  for (let i = 0; i < base.points.length; i++) {
    const p = base.points[i]
    const proud = proudAt(i, p, t)
    if (proud === 0) {
      points.push({ x: p.x, y: p.y })
      continue
    }
    const n = inwardNormal(base.points, i)
    points.push({ x: p.x + n.x * proud, y: p.y + n.y * proud })
  }

  const u = arcLengthU(points)
  return { points, u, z }
}

/** Cumulative arc length of a ring, normalised to 0..1. */
export function arcLengthU(points: Point2[]): number[] {
  const cumulative: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    cumulative.push(cumulative[i - 1] + d)
  }
  const total = cumulative[cumulative.length - 1] || 1
  return cumulative.map((c) => c / total)
}

/** Ring depth for ring index r of RING_COUNT, back wall (0) to mouth. */
export function ringZ(r: number): number {
  return -FOOTPRINT.depthM * (r / (RING_COUNT - 1))
}
