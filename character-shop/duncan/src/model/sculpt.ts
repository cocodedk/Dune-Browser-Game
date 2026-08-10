// character-shop/duncan/src/model/sculpt.ts
// What a lofted surface is made of, one ring at a time, and the hook that
// lets a FIELD carve into it. Split out of loft.ts when that file reached
// 200 lines: loft.ts assembles rings into an indexed mesh, this decides
// where each vertex of a ring goes.
//
// The ring is an EGG, not a circle: rz eases from rb at the back to rf at
// the front across the section, so a chest can project forward while the
// back stays broad and flat. It is C1-continuous at the sides (both the
// value and its slope match at theta = +/-PI/2), so no crease runs down the
// flanks.

import type { Profile } from './stations'

/** One vertex of a lofted surface, handed to a SCULPTOR before it is
 *  written. x/y/z are the position in the owning group's frame and are meant
 *  to be mutated; nx/nz are the outward horizontal unit direction at that
 *  vertex (from the section's own centre), so a field can push along the
 *  surface instead of always along an axis. */
export interface SurfacePoint {
  x: number
  y: number
  z: number
  nx: number
  nz: number
}

/** A summed displacement field. This is how every FACE form in this shop is
 *  built: the skull stays one continuous loft and the brow, sockets, nose,
 *  lips and chin are carved INTO it by adding bells to its vertices. Pass 3
 *  died assembling features out of separate ellipsoids ("armor pauldrons,
 *  not muscle"); a field cannot produce that failure, because there is only
 *  ever one surface. */
export type Sculptor = (point: SurfacePoint) => void

export const DOME_STEPS = 4

// One scratch point for the whole build: a face is ~10k vertices and each
// would otherwise allocate an object the sculptor immediately discards.
const POINT: SurfacePoint = { x: 0, y: 0, z: 0, nx: 0, nz: 0 }

/** Runs a sculptor at one point and pushes the result. `nx`/`nz` are handed
 *  in rather than derived, because the apexes have no outward direction. */
export function push(
  out: number[], x: number, y: number, z: number, nx: number, nz: number, sculpt?: Sculptor,
): void {
  if (!sculpt) {
    out.push(x, y, z)
    return
  }
  POINT.x = x
  POINT.y = y
  POINT.z = z
  POINT.nx = nx
  POINT.nz = nz
  sculpt(POINT)
  out.push(POINT.x, POINT.y, POINT.z)
}

export function ring(
  p: Profile, y: number, scale: number, radial: number, out: number[], sculpt?: Sculptor,
): void {
  for (let i = 0; i < radial; i++) {
    const theta = (i / radial) * Math.PI * 2
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    const rz = (p.rb * (1 + c) + p.rf * (1 - c)) / 2
    const dx = p.rx * scale * s
    const dz = rz * scale * c
    const len = Math.hypot(dx, dz) || 1
    push(out, p.cx + dx, y, p.cz + dz, dx / len, dz / len, sculpt)
  }
}

/** Rings for one rounded end: a quarter-ellipse of height `h`, shrinking the
 *  section to nothing at the apex. The apex vertex itself is pushed by the
 *  caller so the fan can be wound per end. */
export function domeRings(
  p: Profile, y0: number, h: number, radial: number, out: number[], sculpt?: Sculptor,
): number {
  for (let k = 1; k < DOME_STEPS; k++) {
    const phi = (k / DOME_STEPS) * (Math.PI / 2)
    ring(p, y0 + h * Math.sin(phi), Math.cos(phi), radial, out, sculpt)
  }
  return DOME_STEPS - 1
}
