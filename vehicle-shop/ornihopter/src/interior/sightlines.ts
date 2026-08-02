// vehicle-shop/ornihopter/src/interior/sightlines.ts
// What the pilot's eye actually hits, ray by ray, with no renderer involved.
//
// WHY THIS EXISTS. Round 6's cockpit critic found three holes by sampling
// pixels in a capture — a slot between the panel top and the coaming with
// sunlit sand through it, desert filling the lower-left past the dash's end,
// and bare sky filling 82% of the upper frame. Every one of those is a ray
// from PILOT_EYE that leaves the airframe without meeting anything, and every
// one of them was invisible to the unit suite, which only ever asked whether
// boxes intersected a frustum. A box can be inside the frustum and still leave
// a hole beside it.
//
// three's Raycaster honours material.side, which is the whole point: the hull
// skin (model/Ornithopter.ts) is FrontSide, so from inside the cabin it is not
// there at all — exactly as the renderer sees it. A ray that hits nothing here
// is a ray that shows open desert on screen. No DOM, no GL: Raycaster is pure
// math, so this runs in the node unit environment like everything else.

import { Raycaster, Vector3, type Object3D, type Material } from 'three'
import { PILOT_EYE } from '../spec'

/** Camera contract, copied from camera/cameraRig.ts's pilot mode and
 *  tools/shoot.mjs's capture size so a sample here is a pixel there. */
export const PILOT_FOV_DEG = 68
export const PILOT_ASPECT = 1600 / 1000

export type GazeHit = 'structure' | 'glazing' | 'open'

export interface FrameSample {
  /** Normalised device coords: -1..1, y up. */
  ndcX: number
  ndcY: number
  hit: GazeHit
  distance: number
}

/**
 * Gaze direction in craft-local space for a screen point, at a given head
 * pose. Mirrors cameraRig.applyHead exactly: rotation order YXZ, and yaw
 * NEGATED about +Y so positive yaw is to starboard (see headLook.test.ts).
 */
export function gazeDirection(
  ndcX: number,
  ndcY: number,
  yawDeg = 0,
  pitchDeg = 0
): Vector3 {
  const tanHalfV = Math.tan((PILOT_FOV_DEG * Math.PI) / 360)
  const dir = new Vector3(ndcX * tanHalfV * PILOT_ASPECT, ndcY * tanHalfV, -1).normalize()
  const pitch = (pitchDeg * Math.PI) / 180
  const yaw = (-yawDeg * Math.PI) / 180
  // YXZ: pitch about X first, then yaw about Y — turning the head, not
  // rolling it.
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const y1 = dir.y * cp - dir.z * sp
  const z1 = dir.y * sp + dir.z * cp
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  return new Vector3(dir.x * cy + z1 * sy, y1, -dir.x * sy + z1 * cy)
}

function isGlazing(material: Material | Material[] | undefined): boolean {
  const list = Array.isArray(material) ? material : material ? [material] : []
  return list.some((m) => {
    const mat = m as Material & { opacity?: number }
    return mat.transparent === true && (mat.opacity ?? 1) < 0.95
  })
}

const EYE = new Vector3(PILOT_EYE.x, PILOT_EYE.y, PILOT_EYE.z)

/** One ray from the eye. `targets` are craft-local roots — the cockpit and
 *  the canopy — each at identity, which is how both are parented in main.ts
 *  before the craft root's own transform. Their world matrices are refreshed
 *  here rather than assumed: Raycaster reads matrixWorld and does not update
 *  it, and a stale one silently raycasts against the origin. */
export function castGaze(targets: Object3D[], direction: Vector3): { hit: GazeHit; distance: number } {
  const raycaster = new Raycaster(EYE, direction, 0.02, 400)
  for (const t of targets) t.updateMatrixWorld(true)
  const hits = raycaster.intersectObjects(targets, true)
  if (hits.length === 0) return { hit: 'open', distance: Infinity }
  const first = hits[0]
  const material = (first.object as Object3D & { material?: Material | Material[] }).material
  return { hit: isGlazing(material) ? 'glazing' : 'structure', distance: first.distance }
}

/**
 * Does this ray REACH THE OUTSIDE — sky or desert — rather than merely meet
 * glass?
 *
 * castGaze above stops at the first hit and calls a transparent one 'glazing',
 * which is the right instrument for "is the airframe sealed" and the WRONG one
 * for "what can the pilot see". MEASURED, round 9e: the shipped tree read
 * 15.2% glazing at pitch 0 by that count while the capture showed under 11%
 * exterior, because a ray can pass the cabin-side pane and then land on the
 * canopy's own opaque rim or a roof member behind it. This walks the whole hit
 * list instead and answers with the FIRST OPAQUE hit, which is what a pixel
 * shows: null means nothing opaque is in the way and the desert is there.
 */
export function firstOpaque(
  targets: Object3D[],
  direction: Vector3
): { object: Object3D; point: Vector3 } | null {
  const raycaster = new Raycaster(EYE, direction, 0.02, 400)
  for (const t of targets) t.updateMatrixWorld(true)
  for (const hit of raycaster.intersectObjects(targets, true)) {
    const object = hit.object as Object3D & { material?: Material | Material[] }
    if (!isGlazing(object.material)) return { object, point: hit.point }
  }
  return null
}

/** True when the ray leaves the craft — the fraction of these across the frame
 *  is bar B3-LIVE's "exterior >= 20% at pitch 0". */
export function reachesExterior(targets: Object3D[], direction: Vector3): boolean {
  return firstOpaque(targets, direction) === null
}

/**
 * A grid of samples across the pilot frame. Sampled on a grid rather than at
 * hand-picked points because the holes this exists to catch were found by a
 * critic sweeping pixels, and a hand-picked point can always be the one the
 * builder happened to fix.
 */
export function sampleFrame(
  targets: Object3D[],
  cols: number,
  rows: number,
  yawDeg = 0,
  pitchDeg = 0
): FrameSample[] {
  const samples: FrameSample[] = []
  for (let r = 0; r < rows; r++) {
    // Screen order: r = 0 is the TOP row, so ndcY runs +1 down to -1.
    const ndcY = 1 - ((r + 0.5) * 2) / rows
    for (let c = 0; c < cols; c++) {
      const ndcX = ((c + 0.5) * 2) / cols - 1
      const { hit, distance } = castGaze(targets, gazeDirection(ndcX, ndcY, yawDeg, pitchDeg))
      samples.push({ ndcX, ndcY, hit, distance })
    }
  }
  return samples
}

export interface FrameCoverage {
  open: number
  glazing: number
  structure: number
  /** Fraction of the frame's TOP half that is opaque interior structure —
   *  the critic's own 18.3% measurement, made reproducible. */
  structureTopHalf: number
  total: number
}

export function coverage(samples: readonly FrameSample[]): FrameCoverage {
  const top = samples.filter((s) => s.ndcY > 0)
  const count = (list: readonly FrameSample[], hit: GazeHit) =>
    list.filter((s) => s.hit === hit).length
  return {
    open: count(samples, 'open') / samples.length,
    glazing: count(samples, 'glazing') / samples.length,
    structure: count(samples, 'structure') / samples.length,
    structureTopHalf: top.length ? count(top, 'structure') / top.length : 0,
    total: samples.length,
  }
}
