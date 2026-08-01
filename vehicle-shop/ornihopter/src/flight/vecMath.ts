// vehicle-shop/ornihopter/src/flight/vecMath.ts
// Tiny Vec3 arithmetic not already provided by contracts.ts.

import type { Vec3 } from '../contracts'

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}
