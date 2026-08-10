// landscape-shop/sietch/src/model/surface/curves.ts
// The only maths the R2 surface layer is allowed to share. Deliberately
// tiny and deliberately WITHOUT a noise function: every band, line and
// worn patch in this set is placed by name in one of the sibling modules,
// never sprayed. If a future round needs randomness it has to argue for
// it here first.

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 0 below edge0, 1 above edge1, smooth (zero-slope) at both ends. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-9))
  return t * t * (3 - 2 * t)
}

/**
 * Raised-cosine bump: 1 at d = 0, exactly 0 at |d| >= halfWidth, with a
 * flat tangent at both ends. Every band in this layer is built from this
 * one shape, so a band can never leave a crease where it meets the
 * nominal surface — the crease is what would read as a modelling artefact
 * rather than carved rock.
 */
export function bump(d: number, halfWidth: number): number {
  const a = Math.abs(d)
  if (a >= halfWidth) return 0
  return (1 + Math.cos((Math.PI * a) / halfWidth)) / 2
}

/** Distance from (px, pz) to the segment (ax, az)-(bx, bz), in the XZ plane. */
export function distanceToSegment2D(
  px: number, pz: number, ax: number, az: number, bx: number, bz: number,
): number {
  const dx = bx - ax
  const dz = bz - az
  const lenSq = dx * dx + dz * dz
  const t = lenSq === 0 ? 0 : clamp01(((px - ax) * dx + (pz - az) * dz) / lenSq)
  const cx = ax + dx * t
  const cz = az + dz * t
  return Math.hypot(px - cx, pz - cz)
}

/** Distance from p to the segment a-b, in 3D. */
export function distanceToSegment3D(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): number {
  const dx = bx - ax, dy = by - ay, dz = bz - az
  const lenSq = dx * dx + dy * dy + dz * dz
  const t = lenSq === 0 ? 0 : clamp01(((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / lenSq)
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t), pz - (az + dz * t))
}

/**
 * A path that bows: people cut corners, so a worn line between two points
 * is never the straight segment. Distance to a quadratic Bezier through a
 * control point offset sideways from the chord's midpoint, sampled — good
 * enough at the metre scale a floor path is judged at.
 */
export function distanceToBowedPath(
  px: number, pz: number,
  ax: number, az: number, bx: number, bz: number,
  bowM: number, samples = 10,
): number {
  const mx = (ax + bx) / 2 - ((bz - az) / (Math.hypot(bx - ax, bz - az) || 1)) * bowM
  const mz = (az + bz) / 2 + ((bx - ax) / (Math.hypot(bx - ax, bz - az) || 1)) * bowM
  let best = Infinity
  let prevX = ax
  let prevZ = az
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const it = 1 - t
    const cx = it * it * ax + 2 * it * t * mx + t * t * bx
    const cz = it * it * az + 2 * it * t * mz + t * t * bz
    const d = distanceToSegment2D(px, pz, prevX, prevZ, cx, cz)
    if (d < best) best = d
    prevX = cx
    prevZ = cz
  }
  return best
}
