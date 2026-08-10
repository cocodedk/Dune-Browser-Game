// landscape-shop/sietch/src/model/crossSection.ts
// The hall's vaulted cross-section, in the X-Y plane: floor-left, up a
// LEFT spring wall, over an asymmetric arch to an off-axis crown, down a
// RIGHT spring wall (independently subdivided so the right wall can dent
// into a shallow alcove), to floor-right. Left/right spring heights
// differ and the crown drifts off-centre — vaultAsymmetry.ts varies all
// three by z so the vault reads as hand-carved rock, not a uniform
// architectural extrusion (R1 critic, twice: "a perfectly smooth,
// symmetric ellipsoid dome... reads more like a generic vault... than a
// hand-hewn Fremen cave").
//
// Still shape-only, still smooth per-wall (no per-point noise) — R1 bar.

export interface Point2 {
  x: number
  y: number
}

export interface VaultAsymmetry {
  springFracLeft: number
  springFracRight: number
  /** Horizontal drift of the arch's apex off x = 0, in metres. */
  crownOffsetM: number
  /** Inward dent on the RIGHT vertical wall, in metres, peaking at
   *  mid-wall-height — a shallow alcove, never an outward bulge (would
   *  blow the width guard). 0 = no dent. */
  bulgeAmountM: number
}

export const SYMMETRIC_VAULT: VaultAsymmetry = {
  springFracLeft: 0.35, springFracRight: 0.35, crownOffsetM: 0, bulgeAmountM: 0,
}

export interface VaultProfile {
  points: Point2[]
  halfWidth: number
  springHeightLeft: number
  springHeightRight: number
}

// R1.3: raised from 4/7 — a fresh critic read the dome-to-floor horizon as
// "visibly faceted/kinked rather than a clean curve" (most visible right
// at the wall-to-arch spring transition, close to the floor). At 1,699 of
// a 40,000-triangle budget there was no reason to be this stingy; the
// tube is swept per-ring (loftGeometry.ts) so every extra point here
// costs (rings - 1) * 2 triangles project-wide, still cheap at this
// budget.
//
// R2: raised 12 -> 20. The R2 surface layer displaces this profile per
// point to carve bedding courses into the walls (surface/bedding.ts) and
// 12 segments over a ~6 m wall could not resolve a 1 m course — the step
// smeared into a slope. 20 gives ~0.31 m per segment on the left wall,
// enough for a course to read as a step with a top and a bottom.
//
// R2.1: 20 -> 38, and the wall is no longer subdivided EVENLY. A fresh
// critic read R2's vault as "a uniform sine-wave ripple, not shadowed
// irregular courses", and the reason was never the count: it was that a
// course's riser is smoothed away unless a vertex lands on it. Evenly
// spaced, the riser had to be blended wide enough to survive whichever
// samples happened to straddle it, and a riser as wide as its course is
// a raised cosine. wallSampling.ts now places a PAIR of vertices on each
// course boundary the wall carries, so a riser is exactly one quad at
// every depth; 38 buys the 16 boundary vertices plus enough filler to
// keep the flat faces between them honest.
//
// The arch keeps 30, and its own points are biased toward the springings
// (ARCH_SPRING_BIAS). It carries no courses — carvedProfile.ts fades them
// out above the spring line, because an angle-parametrised arch cannot
// resolve them — so what it has to resolve is its own silhouette and
// carveSweep.ts's ridges, and those run ALONG it at constant depth, which
// makes them RING_COUNT's job rather than this one's.
export const WALL_SEGMENTS = 38
export const ARCH_HALF_SEGMENTS = 30
const CROWN_OFFSET_CLAMP_FRAC = 0.3 // max crown drift, as a fraction of halfWidth

// R2.1: the arch's points are NOT spread evenly in angle any more. Evenly
// in angle means evenly in arc length, which puts most of them near the
// crown — where the surface is nearly horizontal, nothing is bedded
// (bedding stops at BEDDED_TOP_Y_M) and no detail needs them. The courses
// that DO cross the arch sit just above the springing, where an even
// spread gave 0.86 m of rise per segment and a 1 m course could not
// resolve at all. Biasing the angle by this exponent concentrates points
// at both springings: ~0.3 m of rise on the low arch, at the cost of
// coarser (and still smooth-shaded) facets across the crown.
const ARCH_SPRING_BIAS = 1.4

/** Index of the LEFT spring point in buildVaultProfile()'s point list. */
export const SPRING_LEFT_INDEX = WALL_SEGMENTS
/** Index of the crown (the single tallest point). */
export const CROWN_INDEX = WALL_SEGMENTS + ARCH_HALF_SEGMENTS
/** Index of the RIGHT spring point. */
export const SPRING_RIGHT_INDEX = WALL_SEGMENTS + 2 * ARCH_HALF_SEGMENTS
/** Total points a profile always has, at any z. */
export const PROFILE_POINT_COUNT = 2 * WALL_SEGMENTS + 2 * ARCH_HALF_SEGMENTS + 1

/** Bump peaking at the middle of a 0..1 wall-height fraction, zero at both
 *  ends — so a dent never touches the floor edge or the spring point (the
 *  wall's own widest point), which is what keeps the seam width guard
 *  safe regardless of dent size. */
function wallBulgeHump(heightFrac: number): number {
  return Math.sin(heightFrac * Math.PI)
}

/** Heights of one wall's WALL_SEGMENTS + 1 vertices, floor to springing.
 *  R2.1: a caller that knows where the bedding courses are at this depth
 *  supplies them (wallSampling.ts), so a course boundary always lands ON
 *  a vertex instead of drifting across a fixed grid. Without it the wall
 *  is subdivided evenly, exactly as it was through R2. */
export interface WallSamples { left: number[]; right: number[] }

function wallY(ys: number[] | undefined, springY: number, i: number): number {
  return ys ? ys[i] : springY * (i / WALL_SEGMENTS)
}

/** Floor to spring, inclusive both ends (spring supplies the arch's own
 *  start point, which the arch never repeats). */
function leftWallAscending(x: number, springY: number, ys?: number[]): Point2[] {
  const points: Point2[] = []
  for (let i = 0; i <= WALL_SEGMENTS; i++) points.push({ x, y: wallY(ys, springY, i) })
  return points
}

/** Spring to floor, EXCLUDING spring (the arch already supplied it) and
 *  INCLUDING floor. The dent's hump follows the vertex's own HEIGHT, not
 *  its index, so an uneven subdivision still dents the same shape. */
function rightWallDescending(
  x: number, springY: number, bulgeAmountM: number, ys?: number[],
): Point2[] {
  const points: Point2[] = []
  for (let i = WALL_SEGMENTS - 1; i >= 0; i--) {
    const y = wallY(ys, springY, i)
    const dent = bulgeAmountM * wallBulgeHump(springY > 0 ? y / springY : 0)
    points.push({ x: x - dent, y })
  }
  return points
}

/** One quarter of the arch, parametrised by angle so a differing spring
 *  height on each side still meets the SAME crown point exactly.
 *  sweepUp: spring (excluded) -> crown (included). !sweepUp: crown
 *  (excluded) -> spring (included). */
function archQuarter(
  fromX: number, fromY: number, crownX: number, crownY: number, sweepUp: boolean,
): Point2[] {
  const points: Point2[] = []
  for (let i = 1; i <= ARCH_HALF_SEGMENTS; i++) {
    const frac = i / ARCH_HALF_SEGMENTS
    // Biased toward theta = 0, which is the SPRINGING on both quarters —
    // see ARCH_SPRING_BIAS. frac = 1 still lands exactly on theta = PI/2
    // (the crown) going up and exactly on 0 (the spring) coming down, so
    // the two quarters still meet the same crown point and the same
    // spring points they always did.
    const theta = sweepUp
      ? (Math.PI / 2) * Math.pow(frac, ARCH_SPRING_BIAS)
      : (Math.PI / 2) * Math.pow(1 - frac, ARCH_SPRING_BIAS)
    points.push({
      x: crownX + (fromX - crownX) * Math.cos(theta),
      y: fromY + (crownY - fromY) * Math.sin(theta),
    })
  }
  return points
}

/**
 * @param halfWidth  Half the hall width (spring-to-spring span / 2).
 * @param heightM    Apex height, y = 0 at the floor.
 * @param asymmetry  Per-z shape variance (vaultAsymmetry.ts). Defaults to
 *   a symmetric profile for any caller that doesn't need the R1.2 carving.
 * @param walls      Per-wall vertex heights (wallSampling.ts). Omitted,
 *   both walls are subdivided evenly.
 */
export function buildVaultProfile(
  halfWidth: number,
  heightM: number,
  asymmetry: VaultAsymmetry = SYMMETRIC_VAULT,
  walls?: WallSamples,
): VaultProfile {
  const { springFracLeft, springFracRight, crownOffsetM, bulgeAmountM } = asymmetry
  const springHeightLeft = heightM * springFracLeft
  const springHeightRight = heightM * springFracRight
  const clamp = halfWidth * CROWN_OFFSET_CLAMP_FRAC
  const crownX = Math.max(-clamp, Math.min(clamp, crownOffsetM))
  const crownY = heightM

  const points: Point2[] = [
    ...leftWallAscending(-halfWidth, springHeightLeft, walls?.left),
    ...archQuarter(-halfWidth, springHeightLeft, crownX, crownY, true),
    ...archQuarter(halfWidth, springHeightRight, crownX, crownY, false),
    ...rightWallDescending(halfWidth, springHeightRight, bulgeAmountM, walls?.right),
  ]

  return { points, halfWidth, springHeightLeft, springHeightRight }
}
