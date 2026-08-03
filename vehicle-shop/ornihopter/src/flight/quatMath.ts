// vehicle-shop/ornihopter/src/flight/quatMath.ts
// Quaternion algebra contracts.ts does not already provide. The multiply
// convention matches contracts.ts's rotate(): rotate(q, v) is the standard
// "rotate vector v by unit quaternion q" formula (identical to three.js's
// Vector3.applyQuaternion), so quatMultiply(a, b) must be a*b in the same
// three.js sense — this is what makes orientation = orientation * delta a
// LOCAL/body-frame rotation about axes expressed in the craft's own frame,
// rather than a world-frame rotation. Getting this order backwards is
// exactly the class of silent, plausible-looking bug the nose/tail mixup
// warned about, so it is asserted directly in quatMath.test.ts.

import type { Quat, Vec3 } from '../contracts'

export const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 }

/** a * b, Hamilton product. */
export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
    y: a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
    z: a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  }
}

/** Unit quaternion rotating by angle radians about axis (need not be unit length). */
export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const magnitude = Math.hypot(axis.x, axis.y, axis.z)
  if (magnitude < 1e-9) return IDENTITY_QUAT

  const half = angle / 2
  const s = Math.sin(half) / magnitude
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) }
}

/** Renormalise, guarding against float drift accumulating over many steps. */
export function quatNormalise(q: Quat): Quat {
  const magnitude = Math.hypot(q.x, q.y, q.z, q.w)
  if (magnitude < 1e-9) return IDENTITY_QUAT
  return { x: q.x / magnitude, y: q.y / magnitude, z: q.z / magnitude, w: q.w / magnitude }
}
