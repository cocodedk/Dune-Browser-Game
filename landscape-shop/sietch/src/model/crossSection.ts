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
const WALL_SEGMENTS = 12
const ARCH_HALF_SEGMENTS = 20
const CROWN_OFFSET_CLAMP_FRAC = 0.3 // max crown drift, as a fraction of halfWidth

/** Bump peaking at the middle of a 0..1 wall-height fraction, zero at both
 *  ends — so a dent never touches the floor edge or the spring point (the
 *  wall's own widest point), which is what keeps the seam width guard
 *  safe regardless of dent size. */
function wallBulgeHump(heightFrac: number): number {
  return Math.sin(heightFrac * Math.PI)
}

/** Floor to spring, inclusive both ends (spring supplies the arch's own
 *  start point, which the arch never repeats). */
function leftWallAscending(x: number, springY: number): Point2[] {
  const points: Point2[] = []
  for (let i = 0; i <= WALL_SEGMENTS; i++) {
    points.push({ x, y: springY * (i / WALL_SEGMENTS) })
  }
  return points
}

/** Spring to floor, EXCLUDING spring (the arch already supplied it) and
 *  INCLUDING floor. */
function rightWallDescending(x: number, springY: number, bulgeAmountM: number): Point2[] {
  const points: Point2[] = []
  for (let i = WALL_SEGMENTS - 1; i >= 0; i--) {
    const frac = i / WALL_SEGMENTS
    const dent = bulgeAmountM * wallBulgeHump(frac)
    points.push({ x: x - dent, y: springY * frac })
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
    const theta = sweepUp ? frac * (Math.PI / 2) : (Math.PI / 2) * (1 - frac)
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
 */
export function buildVaultProfile(
  halfWidth: number,
  heightM: number,
  asymmetry: VaultAsymmetry = SYMMETRIC_VAULT,
): VaultProfile {
  const { springFracLeft, springFracRight, crownOffsetM, bulgeAmountM } = asymmetry
  const springHeightLeft = heightM * springFracLeft
  const springHeightRight = heightM * springFracRight
  const clamp = halfWidth * CROWN_OFFSET_CLAMP_FRAC
  const crownX = Math.max(-clamp, Math.min(clamp, crownOffsetM))
  const crownY = heightM

  const points: Point2[] = [
    ...leftWallAscending(-halfWidth, springHeightLeft),
    ...archQuarter(-halfWidth, springHeightLeft, crownX, crownY, true),
    ...archQuarter(halfWidth, springHeightRight, crownX, crownY, false),
    ...rightWallDescending(halfWidth, springHeightRight, bulgeAmountM),
  ]

  return { points, halfWidth, springHeightLeft, springHeightRight }
}
