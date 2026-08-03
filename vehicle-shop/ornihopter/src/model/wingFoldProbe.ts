// vehicle-shop/ornihopter/src/model/wingFoldProbe.ts
// The clearance instrument for the wing fold, in the house probe style
// (geometry/gear/meshProbe.ts, flight/testHelpers.ts): it lives beside the
// thing it probes and answers questions of the REAL rig — the same
// createWingRig hierarchy, the same blade buffer, the same hull envelope and
// the same landing-gear mesh three.js draws — so a clearance proved here is a
// claim about the rendered craft, not about a re-derivation of it.
//
// A blade is measured as its ORIENTED BOUNDING BOX, which strictly contains
// the tapered plank inside it, so every separation reported here is a LOWER
// bound on the true gap. Box-to-box separation is exact by the separating-axis
// theorem over 15 candidate axes; the largest positive one is the width of the
// gap along the axis that opens it. That matters more than tightness: the
// answer "these two never touch" has to be sound, and a conservative
// instrument that says 0.18m when the truth is 0.30m is the right kind of
// wrong.

import { Vector3, Matrix4, MeshBasicMaterial, type Object3D } from 'three'
import { createWingRig } from './WingRig'
import { buildWingBladeGeometry, SPAN_STATIONS, SECTION_POINTS } from './geometry/wingGeometry'
import { pivotForMount } from './geometry/wing/rootPod'
import { WING, WING_ROOTS } from '../spec'
import type { WingSide } from './wingKinematics'

export const SIDES: readonly WingSide[] = ['left', 'right']

const material = new MeshBasicMaterial()
const blades: Record<WingSide, ReturnType<typeof buildWingBladeGeometry>> = {
  left: buildWingBladeGeometry('left', WING.reach),
  right: buildWingBladeGeometry('right', WING.reach),
}

export interface Obb {
  centre: Vector3
  axes: [Vector3, Vector3, Vector3]
  half: [number, number, number]
}

export interface BladeProbe {
  readonly name: string
  readonly side: WingSide
  readonly pairIndex: number
  /** Pose the blade at this fold progress and read its world transform. */
  at(fold: number): { obb: Obb; matrix: Matrix4 }
}

/** Blade-local bounds, measured off the buffer rather than assumed. */
function localBounds(side: WingSide): { min: Vector3; max: Vector3 } {
  const p = blades[side].attributes.position
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (let i = 0; i < p.count; i++) {
    min.min(new Vector3(p.getX(i), p.getY(i), p.getZ(i)))
    max.max(new Vector3(p.getX(i), p.getY(i), p.getZ(i)))
  }
  return { min, max }
}

/** All eight blades, wired exactly as Ornithopter.ts wires them. */
export function bladeProbes(): BladeProbe[] {
  return WING_ROOTS.flatMap((mount, pairIndex) => SIDES.map((side) => {
    const pivot = pivotForMount(mount)
    const attachment = { x: (side === 'right' ? 1 : -1) * pivot.x, y: pivot.y, z: mount.z }
    const rig = createWingRig(side, pairIndex, attachment, blades[side], material)
    const bounds = localBounds(side)
    const centre = bounds.min.clone().add(bounds.max).multiplyScalar(0.5)
    const half = bounds.max.clone().sub(bounds.min).multiplyScalar(0.5)
    return {
      name: `pair ${pairIndex} ${side}`,
      side,
      pairIndex,
      at(fold: number) {
        rig.update(0, 0, fold)
        rig.root.updateMatrixWorld(true)
        const blade = rig.root.getObjectByName('wing-blade') as Object3D
        const matrix = blade.matrixWorld.clone()
        const axes: [Vector3, Vector3, Vector3] = [
          new Vector3().setFromMatrixColumn(matrix, 0).normalize(),
          new Vector3().setFromMatrixColumn(matrix, 1).normalize(),
          new Vector3().setFromMatrixColumn(matrix, 2).normalize(),
        ]
        return {
          matrix,
          obb: { centre: centre.clone().applyMatrix4(matrix), axes, half: [half.x, half.y, half.z] },
        }
      },
    }
  }))
}

/**
 * The blade as a CHAIN of tight boxes, one per span bay, instead of a single
 * box round the whole plank. The single box is 23m long and as deep as the
 * root rod everywhere, so it swallows hull and gear the blade misses by a
 * metre; per-bay boxes follow the real taper (a thin rod inboard, a wide thin
 * blade outboard) and still strictly contain it.
 */
export function bladeBoxes(probe: BladeProbe, fold: number): Obb[] {
  const { matrix } = probe.at(fold)
  const p = blades[probe.side].attributes.position
  const bays = SPAN_STATIONS.length - 1
  const out: Obb[] = []
  for (let bay = 0; bay < bays; bay++) {
    const min = new Vector3(Infinity, Infinity, Infinity)
    const max = new Vector3(-Infinity, -Infinity, -Infinity)
    for (let s = bay; s <= bay + 1; s++) {
      for (let c = 0; c < SECTION_POINTS; c++) {
        const v = s * SECTION_POINTS + c
        min.min(new Vector3(p.getX(v), p.getY(v), p.getZ(v)))
        max.max(new Vector3(p.getX(v), p.getY(v), p.getZ(v)))
      }
    }
    const centre = min.clone().add(max).multiplyScalar(0.5)
    const half = max.clone().sub(min).multiplyScalar(0.5)
    const axes: [Vector3, Vector3, Vector3] = [
      new Vector3().setFromMatrixColumn(matrix, 0).normalize(),
      new Vector3().setFromMatrixColumn(matrix, 1).normalize(),
      new Vector3().setFromMatrixColumn(matrix, 2).normalize(),
    ]
    out.push({ centre: centre.applyMatrix4(matrix), axes, half: [half.x, half.y, half.z] })
  }
  return out
}

/** Smallest separation between two blades, over every pair of bays. */
export function bladeGap(a: Obb[], b: Obb[]): number {
  let worst = Infinity
  for (const boxA of a) for (const boxB of b) worst = Math.min(worst, obbSeparation(boxA, boxB))
  return worst
}

/** Smallest distance from a world point to a blade. */
export function pointToBlade(point: Vector3, boxes: Obb[]): number {
  let worst = Infinity
  for (const box of boxes) worst = Math.min(worst, pointToObb(point, box))
  return worst
}

/** Every blade vertex in world space at this pose. */
export function bladePoints(probe: BladeProbe, fold: number, stride = 1): Vector3[] {
  const { matrix } = probe.at(fold)
  const p = blades[probe.side].attributes.position
  const out: Vector3[] = []
  for (let i = 0; i < p.count; i += stride) {
    out.push(new Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(matrix))
  }
  return out
}

function radius(box: Obb, axis: Vector3): number {
  return box.half[0] * Math.abs(box.axes[0].dot(axis))
    + box.half[1] * Math.abs(box.axes[1].dot(axis))
    + box.half[2] * Math.abs(box.axes[2].dot(axis))
}

/**
 * Separation of two boxes: positive is a real gap of that many metres along
 * the best separating axis, negative means they overlap. Exact for boxes —
 * the separating-axis theorem's 6 face normals and 9 edge cross products.
 */
export function obbSeparation(a: Obb, b: Obb): number {
  const delta = b.centre.clone().sub(a.centre)
  const axes: Vector3[] = [...a.axes, ...b.axes]
  for (const u of a.axes) {
    for (const v of b.axes) {
      const cross = u.clone().cross(v)
      if (cross.lengthSq() > 1e-12) axes.push(cross.normalize())
    }
  }
  let best = -Infinity
  for (const axis of axes) {
    best = Math.max(best, Math.abs(delta.dot(axis)) - radius(a, axis) - radius(b, axis))
  }
  return best
}

/** Distance from a world point to a box; 0 inside. Exact. */
export function pointToObb(point: Vector3, box: Obb): number {
  const delta = point.clone().sub(box.centre)
  let sum = 0
  for (let i = 0; i < 3; i++) {
    const d = delta.dot(box.axes[i])
    const over = Math.abs(d) - box.half[i]
    if (over > 0) sum += over * over
  }
  return Math.sqrt(sum)
}
