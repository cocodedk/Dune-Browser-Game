// vehicle-shop/harvester/src/contracts.ts
// Interfaces the halves of the rig implement. Owned by the lead; builders
// import from here and must not edit it. The crawler core is pure and has no
// three.js import, so it stays unit-testable in Vitest's DOM-less node
// environment — the same split the ornithopter shop uses.

/** Plain vector, deliberately not three.js. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Normalised operator demand. Every field is a demand, never a rate. */
export interface CrawlerInput {
  /** -1 full reverse .. +1 full forward. */
  throttle: number
  /** -1 hard left .. +1 hard right. */
  steer: number
}

export interface CrawlerState {
  position: Vec3
  /** Radians about +Y; positive turns the nose to port (CCW from above). */
  yaw: number
  /** Terrain-following pitch, radians; positive = nose up. */
  pitch: number
  /** Terrain-following roll, radians; positive = starboard up. */
  roll: number
  /** Signed forward speed, m/s. Negative when reversing. */
  speed: number
  /** Track band speeds, m/s, signed — the two halves of the differential. */
  trackLeft: number
  trackRight: number
}

export interface CrawlerModel {
  readonly state: Readonly<CrawlerState>
  /** Advance by dt seconds. Must be stable for dt up to 0.1s. */
  step(input: CrawlerInput, dt: number): void
  reset(): void
}

/** Structural stand-in for THREE.Object3D — no three.js import here. */
export interface Object3DLike {
  add(...objects: never[]): unknown
  position: { x: number; y: number; z: number; set(x: number, y: number, z: number): unknown }
  rotation: { x: number; y: number; z: number; order: string }
}

/** The machine itself: hull, deck, boom, tracks. */
export interface HarvesterModel {
  /** Root object. main.ts sets its position/rotation from CrawlerState each
   *  frame; the model must never write to them itself. */
  readonly root: Object3DLike
  /** Advance the track wheels from the crawler state. */
  update(state: Readonly<CrawlerState>, dt: number): void
  dispose(): void
}

/** Bearing of the machine's forward direction, degrees, 0 = facing -Z. */
export function bearingDeg(state: Readonly<CrawlerState>): number {
  const fx = -Math.sin(state.yaw)
  const fz = -Math.cos(state.yaw)
  return (Math.atan2(-fx, -fz) * 180) / Math.PI
}
