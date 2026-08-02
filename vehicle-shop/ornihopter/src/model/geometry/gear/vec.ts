// vehicle-shop/ornihopter/src/model/geometry/gear/vec.ts
// The handful of vector operations the gear's builders share.
//
// Split out in round 6d, when one leg stopped being "two segments and a pad"
// and became four parts with their own files (./hipBracket.ts, ./leg.ts,
// ./skid.ts). Every one of them needs to walk along a direction and to build a
// local frame; without this they would each carry their own copy, which is how
// two files end up disagreeing about what `towards` normalises.
//
// ./plate.ts keeps its own private copies on purpose: it is the primitive the
// whole gear is built from and gearMesh.test.ts's winding case is the only
// thing standing between it and a mirrored side that renders black. It does
// not get a new dependency for four lines of arithmetic.

import type { Vec3 } from './plate'
import type { Point3 } from './hipSeat'

export function vec(p: Point3): Vec3 {
  return [p.x, p.y, p.z]
}

export function unit(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / length, a[1] / length, a[2] / length]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

/** Unit vector from `from` to `to`. */
export function towards(from: Vec3, to: Vec3): Vec3 {
  return unit([to[0] - from[0], to[1] - from[1], to[2] - from[2]])
}

export function distance(from: Vec3, to: Vec3): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
}

export function walk(from: Vec3, direction: Vec3, metres: number): Vec3 {
  return [
    from[0] + direction[0] * metres,
    from[1] + direction[1] * metres,
    from[2] + direction[2] * metres,
  ]
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
}

/** Horizontal part of a direction, renormalised. */
export function flatten(direction: Vec3): Vec3 {
  const length = Math.hypot(direction[0], direction[2]) || 1
  return [direction[0] / length, 0, direction[2] / length]
}
