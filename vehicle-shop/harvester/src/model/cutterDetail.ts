// vehicle-shop/harvester/src/model/cutterDetail.ts
// COMPONENT 3a — the cutter's layout numbers, the DRUM (the machine's mouth)
// and the truss conveyor that carries what the drum cuts up to the feed
// hopper. Split out of cutter.ts (round I3) so both files stay under the
// 200-line cap now that the head is 8 m tall and the assembly has a drum,
// a conveyor, rams and flank fairings. No scene access, no crawler state
// beyond the two track speeds handed to drumAngularSpeed().
//
// ======================= THE FEEDING SIGN =======================
// Derived here from the axis convention (spec.ts: -Z forward, +Y up, +X
// starboard), not copied from anywhere, and pinned by cutterDetail.test.ts.
//
// A point on the drum at radius vector r = (0, y, z) from the axis, spun at
// angular velocity w about +X, moves at v = w * (x_hat CROSS r) = w*(0,-z,y).
// At the drum's BOTTOM r = (0, -R, 0), so v = (0, 0, -w*R): the surface at
// the sand line travels toward +Z exactly when w is NEGATIVE. +Z is aft, so
// a negative w drags the sand it cuts back UNDER the head and into the
// throat — the feeding way. A positive w would fling the spice forward,
// ahead of a machine that is about to drive over it.
//
// This is NOT the wheels' sign reused. wheelAngularSpeed() is also negative
// at positive speed, but its argument is the opposite one: a wheel's contact
// patch must stand STILL against the ground (roll without slip), whereas the
// drum's contact surface must move rearward FASTER than the machine advances
// — that is what cutting is. The two coincide because both must not push
// ground forward; DRUM_GEAR below is the difference that makes one a cutter.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { BODY, BOOM } from '../spec'

/** The arm: a short deep boom from the nose face into the head's back. */
export const ARM = {
  halfWidth: BOOM.halfWidth,
  height: 4.0,
  y: BOOM.y,
  aftZ: BODY.noseZ,
  foreZ: -29.5,
  /** The boom's top face — what the rams push on and the conveyor's truss
   *  legs stand on. */
  top: BOOM.y + 2.0,
} as const

/** The grinder head: spec.headHeight tall, held clear of the sand by the
 *  boom, with the drum and the fixed lip teeth reaching down to the bed. */
export const HEAD = {
  halfWidth: BOOM.cutterHalfWidth,
  height: BOOM.headHeight,
  bottomY: 1.2,
  /** Set by the drum, not chosen: the face must clear the picks' swept
   *  circle (axisZ + pickReach = -32.08) or the drum mills its own housing. */
  frontZ: -32.0,
  depth: 4.2,
} as const

/** The drum. Its axis height is set by the ONE hard constraint the round-5
 *  ruling left: the lowest pick tip must scrape within half a metre of the
 *  sand (2.45 - 2.1 = 0.35 m), and its z by the other: the pick tips must
 *  stay behind BOOM.tipZ - 2 so the cutter grows without moving the tip. */
export const DRUM = {
  radius: BOOM.drumRadius,
  axisY: 2.45,
  /** Pick tips land at -36.32, where the OLD row of seven fixed teeth already
   *  ended: the head grew 2 m and gained a drum with the machine's nose not
   *  moving at all. Growing the head is the job; growing the machine is not. */
  axisZ: -34.2,
  length: 16.6,
  /** Pick box, radially: root buried in the barrel, tip proud of it. */
  pickRoot: 1.2,
  pickReach: 2.1,
  picksAround: 8,
  /** Seven pick stations — the seven teeth of every round before this one,
   *  now riding the drum instead of standing still. */
  stations: [-7.5, -5, -2.5, 0, 2.5, 5, 7.5],
  /** Each station's ring is twisted on from the last, so the picks read as
   *  a helix rather than seven identical rings. */
  stationTwist: 0.12,
  flightPerSide: 9,
} as const

/** Surface speed multiple over the machine's own crawl. A drum that turned
 *  at 1x would merely roll along the bed; a cutter has to outrun the
 *  advance to break material off it. */
export const DRUM_GEAR = 3

/** The machine has no throttle in CrawlerState that the paused debug handle
 *  can drive, and drive() sets the two TRACK speeds only (state.speed stays
 *  0). Their mean IS the forward speed by construction — kinematics builds
 *  trackLeft/Right as speed +- steer*STEER_DIFF — so reading the mean is
 *  both the correct forward speed and the one that moves under drive(). */
export function forwardSpeedOf(trackLeft: number, trackRight: number): number {
  return (trackLeft + trackRight) / 2
}

/** Signed angular speed of the drum, rad/s about +X. Negative at forward
 *  speed: see THE FEEDING SIGN at the top of this file. */
export function drumAngularSpeed(trackLeft: number, trackRight: number): number {
  return -(DRUM_GEAR * forwardSpeedOf(trackLeft, trackRight)) / DRUM.radius
}

/** Rest angle of the pick in ring `ring` at station index `station`, at drum
 *  phase `phase`. Angle 0 points at +Y (straight up); it advances toward +Z. */
export function pickAngle(ring: number, station: number, phase = 0): number {
  return phase + (ring * 2 * Math.PI) / DRUM.picksAround + station * DRUM.stationTwist
}

/** Height above the sand of the LOWEST pick tip at drum phase `phase` — the
 *  round-5 "scrapes the bed" invariant, checked at every phase rather than
 *  at the one the model happens to be built in. */
export function lowestPickTipY(phase: number): number {
  let lowest = Infinity
  for (let s = 0; s < DRUM.stations.length; s++) {
    for (let r = 0; r < DRUM.picksAround; r++) {
      lowest = Math.min(lowest, DRUM.axisY + DRUM.pickReach * Math.cos(pickAngle(r, s, phase)))
    }
  }
  return lowest
}

export interface CutterSubAssembly {
  group: Group
  dispose(): void
}

/** The drum: a barrel along X, seven twisted rings of picks around it, two
 *  opposite-hand helical flights that sweep what it cuts toward the centre
 *  throat, and an end disc each side. The GROUP sits on the axis, so the
 *  caller spins the whole thing with group.rotation.x. */
export function buildDrum(dark: MeshStandardMaterial, accent: MeshStandardMaterial): CutterSubAssembly {
  const group = new Group()
  group.name = 'cutterDrum'
  group.position.set(0, DRUM.axisY, DRUM.axisZ)
  const geometries: BufferGeometry[] = []

  const add = (geometry: BufferGeometry, mat: MeshStandardMaterial, name: string): Mesh => {
    const mesh = new Mesh(geometry, mat)
    mesh.name = name
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  const barrel = new CylinderGeometry(DRUM.radius, DRUM.radius, DRUM.length, 16)
  geometries.push(barrel)
  add(barrel, dark, 'drumBarrel').rotation.z = Math.PI / 2

  const disc = new CylinderGeometry(DRUM.radius + 0.2, DRUM.radius + 0.2, 0.25, 16)
  geometries.push(disc)
  for (const side of [1, -1] as const) {
    const mesh = add(disc, accent, 'drumDisc')
    mesh.rotation.z = Math.PI / 2
    mesh.position.x = side * (DRUM.length / 2 - 0.15)
  }

  const pick = new BoxGeometry(1.5, DRUM.pickReach - DRUM.pickRoot, 0.55)
  geometries.push(pick)
  const pickR = (DRUM.pickRoot + DRUM.pickReach) / 2
  DRUM.stations.forEach((x, station) => {
    for (let ring = 0; ring < DRUM.picksAround; ring++) {
      const a = pickAngle(ring, station)
      const mesh = add(pick, accent, 'drumPick')
      mesh.position.set(x, pickR * Math.cos(a), pickR * Math.sin(a))
      mesh.rotation.x = a
    }
  })

  const flight = new BoxGeometry(0.9, 0.55, 0.4)
  geometries.push(flight)
  const flightR = DRUM.radius + 0.2
  for (const side of [1, -1] as const) {
    for (let k = 0; k < DRUM.flightPerSide; k++) {
      const a = side * (0.4 + k * 0.34)
      const mesh = add(flight, dark, 'drumFlight')
      mesh.position.set(side * (0.6 + k * 0.85), flightR * Math.cos(a), flightR * Math.sin(a))
      mesh.rotation.x = a
    }
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}

/** Where the conveyor's two end drums sit: out of the head's back, up to the
 *  feed hopper's flank — a 26-degree climb, the deck conveyor's own language
 *  (a sloped slab on truss legs) and emphatically not vertical. The builder
 *  itself lives in cutter.ts, where the shared mesh helpers are. */
export const CONVEYOR = {
  lowY: 6.6,
  lowZ: -28.6,
  highY: 8.7,
  highZ: -24.4,
  width: 3.8,
  drumRadius: 0.7,
  /** Truss-leg stations along the boom's top. */
  legZ: [-27.6, -25.4],
} as const
