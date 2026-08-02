// vehicle-shop/ornihopter/src/contracts.ts
// Interfaces the three halves of the rig implement. Owned by the lead; the
// builders import from here and must not edit it. It exists so the flight
// model, the craft geometry and the cockpit interior can be built in parallel
// without meeting in a shared file.

/** Plain vector types, deliberately not three.js, so the flight model stays
 *  pure and testable in Vitest's DOM-less node environment. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Quat {
  x: number
  y: number
  z: number
  w: number
}

/** Normalised pilot demand. Every field is a demand, never a rate. */
export interface FlightInput {
  /** -1 nose down .. +1 nose up. */
  pitch: number
  /** -1 roll left .. +1 roll right. */
  roll: number
  /** -1 yaw left .. +1 yaw right. */
  yaw: number
  /** 0 idle .. 1 full. */
  throttle: number
  /** True while the auto-level key is held: pitch and roll are overridden
   *  toward level, heading and throttle stay under manual control. Optional
   *  so every pre-existing FlightInput literal keeps compiling unchanged;
   *  absent means false. See flight/autoLevel.ts. */
  autoLevel?: boolean
}

export interface FlightState {
  position: Vec3
  velocity: Vec3
  /** Craft orientation. Local -Z is the nose, local +Y is up, local +X is the
   *  starboard wing. See spec.ts for why this is written down. */
  orientation: Quat
  throttle: number
  /** Metres per second, magnitude of velocity. */
  speed: number
  /** Height of the craft origin above the terrain directly beneath it. */
  altitude: number
  /** Wing beat phase in radians, advanced by the model so that geometry and
   *  dynamics cannot drift apart. */
  beatPhase: number
  /** Beats per second at the current throttle — the HUD and the wing rig both
   *  read this rather than recomputing it. */
  beatHz: number
  /** Mirrors FlightInput.autoLevel from the step that produced this state, so
   *  the HUD can show a hint without reaching past the published contract.
   *  Optional for the same reason as FlightInput.autoLevel above. */
  autoLevel?: boolean
  /** True while the craft is resting on its gear: the feet are on the sand,
   *  the position is held rather than clamped, and the wing drive is winding
   *  down or spooling back up. Absent means airborne. See flight/landing.ts. */
  landed?: boolean
  /** 0..1 wing-drive spool. 1 everywhere in flight — beatHz is exactly
   *  beatHzFor(throttle) there, as it always was — and it winds to 0 while
   *  parked. It multiplies beatHz AND the wing rig's flap/feather strokes
   *  (model/WingRig.ts), which is what lets the wings ease flat to the parked
   *  pose instead of freezing mid-stroke when the beat stops. Optional, so
   *  every pre-existing FlightState literal keeps compiling; absent means 1. */
  beatAmplitude?: number
}

export interface FlightModel {
  readonly state: Readonly<FlightState>
  /** Advance by dt seconds. Must be stable for dt up to 0.1s. */
  step(input: FlightInput, dt: number): void
  reset(): void
}

/** The craft's exterior: hull, canopy shell, wings, tail, landing gear. */
export interface CraftModel {
  /** Root object. The stage sets its position and quaternion from FlightState;
   *  the model must never write to them itself. */
  readonly root: Object3DLike
  /** Called once per frame after the flight model has stepped. Drives the wing
   *  rig from the beat phase the flight model owns. */
  update(state: Readonly<FlightState>): void
  dispose(): void
}

/** The cockpit interior: seats, console, sticks, cabin shell. */
export interface CockpitModel {
  /** Parented under the craft root by the stage, not by the cockpit itself. */
  readonly root: Object3DLike
  update(state: Readonly<FlightState>): void
  dispose(): void
}

/**
 * Structural stand-in for THREE.Object3D. Typed loosely here so this file
 * carries no three.js import and can be read by the pure flight tests.
 */
export interface Object3DLike {
  add(...objects: never[]): unknown
  position: { set(x: number, y: number, z: number): unknown }
  quaternion: { set(x: number, y: number, z: number, w: number): unknown }
}

/** World-space direction the nose points, given an orientation. Pure. */
export function noseDirection(q: Quat): Vec3 {
  // Rotate local (0, 0, -1) by q.
  return rotate(q, { x: 0, y: 0, z: -1 })
}

/** World-space direction of the craft's up axis. Pure. */
export function upDirection(q: Quat): Vec3 {
  return rotate(q, { x: 0, y: 1, z: 0 })
}

/** World-space direction of the craft's starboard axis. Pure. */
export function starboardDirection(q: Quat): Vec3 {
  return rotate(q, { x: 1, y: 0, z: 0 })
}

/** Rotate a vector by a quaternion. Pure, no three.js. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y
  const iy = q.w * v.y + q.z * v.x - q.x * v.z
  const iz = q.w * v.z + q.x * v.y - q.y * v.x
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  }
}

export function normalise(v: Vec3): Vec3 {
  const m = Math.hypot(v.x, v.y, v.z)
  return m > 1e-9 ? { x: v.x / m, y: v.y / m, z: v.z / m } : { x: 0, y: 0, z: 0 }
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}
