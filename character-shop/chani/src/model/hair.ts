// character-shop/chani/src/model/hair.ts
// Loose dark curly hair past the shoulders — spec.ts COSTUME.head calls this
// a recognition feature. R1 pass 3 rebuild: pass 2's single offset sphere
// read as a helmet shell with a hard diagonal hairline, because a sphere
// intersecting a sphere leaves exactly one hard circle.
//
// Two parts instead:
//   1. A lofted crown mass whose front line (zc - rzF) stays BEHIND the face
//      surface at cheek and eye height and only crosses it around 0.68 of
//      head height — so the hairline appears where two near-tangent surfaces
//      meet, which is soft by construction, and the hair frames the face
//      instead of capping it.
//   2. Eight lofted LOCKS falling past the shoulder line, each starting
//      buried inside the crown mass and tapering to a point, on waved paths
//      with different phases. Overlapping locks are what break the outline
//      into something curly; a single mass cannot do it at any radius.
// The crown's top ring is the tallest geometry on the figure: the skull ends
// 16mm lower (head.ts), so stature is hair on head, as it should be.

import type { Group, Mesh } from 'three'
import type { Proportions } from './proportions'
import type { ChaniMaterials } from './materials'
import { tube, type Point3 } from './primitives'
import { loft, type Ring } from './loft'

/** Head-local, same frame as head.ts: Y=0 is the chin, +Z is the back. */
function crownRings(p: Proportions): Ring[] {
  const hh = p.headH
  return [
    // Bottom cap is a small nub at the nape, buried inside the collar with
    // ~12mm to spare — set flush, the two surfaces z-fight.
    { y: -hh * 0.13, rx: 0.045, zc: 0.050, rzF: 0.020, rzB: 0.038 },
    { y: hh * 0.05, rx: 0.070, zc: 0.040, rzF: 0.036, rzB: 0.086 },
    { y: hh * 0.22, rx: 0.084, zc: 0.030, rzF: 0.052, rzB: 0.100 },
    { y: hh * 0.38, rx: 0.091, zc: 0.026, rzF: 0.058, rzB: 0.106 },
    { y: hh * 0.54, rx: 0.092, zc: 0.024, rzF: 0.064, rzB: 0.108 },
    // Hairline: from here up the hair front runs ahead of the forehead.
    { y: hh * 0.69, rx: 0.088, zc: 0.020, rzF: 0.070, rzB: 0.104 },
    { y: hh * 0.83, rx: 0.077, zc: 0.016, rzF: 0.066, rzB: 0.092 },
    { y: hh * 0.93, rx: 0.058, zc: 0.014, rzF: 0.052, rzB: 0.072 },
    { y: hh, rx: 0.030, zc: 0.012, rzF: 0.030, rzB: 0.042 },
  ]
}

interface Lock {
  x0: number
  y0: number
  z0: number
  out: number
  drop: number
  r: number
  phase: number
}

const LOCKS: readonly Lock[] = [
  { x0: 0.062, y0: 0.160, z0: 0.030, out: 0.040, drop: 0.36, r: 0.042, phase: 0 },
  { x0: 0.050, y0: 0.150, z0: 0.075, out: 0.048, drop: 0.30, r: 0.038, phase: 1.1 },
  { x0: 0.030, y0: 0.170, z0: 0.095, out: 0.052, drop: 0.25, r: 0.036, phase: 2.0 },
  { x0: 0.072, y0: 0.120, z0: 0.010, out: 0.026, drop: 0.22, r: 0.030, phase: 0.6 },
]

const STEPS = 5
const RADIUS_CURVE = [0.55, 1, 0.98, 0.86, 0.12]

function lockPath(l: Lock, side: number): Point3[] {
  const path: Point3[] = []
  for (let i = 0; i < STEPS; i++) {
    const t = i / (STEPS - 1)
    path.push({
      x: side * (l.x0 + l.out * Math.sin(t * Math.PI * 0.9)),
      y: l.y0 - l.drop * t,
      z: l.z0 + 0.014 * Math.sin(t * Math.PI * 1.6 + l.phase),
    })
  }
  return path
}

export function buildHair(head: Group, p: Proportions, mat: ChaniMaterials): Mesh[] {
  const crown = loft(crownRings(p), mat.hair, 22)
  crown.name = 'hairCrown'
  head.add(crown)

  const locks: Mesh[] = []
  for (const [index, lock] of LOCKS.entries()) {
    for (const side of [-1, 1]) {
      const mesh = tube(
        lockPath(lock, side), RADIUS_CURVE.map((k) => k * lock.r), mat.hair, 12,
      )
      mesh.name = `hairLock${side < 0 ? 'L' : 'R'}${index}`
      head.add(mesh)
      locks.push(mesh)
    }
  }

  return [crown, ...locks]
}
