// vehicle-shop/harvester/src/spec.ts
// The single source of truth for the machine's dimensions. Every builder
// reads this; nobody edits it except the lead. Mirrors the ornithopter shop.
//
// Units are metres, one metre per three.js unit.
//
// AXIS CONVENTION, shared with the ornithopter shop and asserted in tests:
//   -Z is FORWARD (the nose / the cutter).  +Y is UP.  +X is the machine's
//   RIGHT (starboard).  Yaw is rotation about +Y; positive yaw turns the
//   nose toward port (counter-clockwise seen from above).
//
// The origin sits on the ground line, mid-track-span, amidships: the root's
// position.y IS the terrain height under the machine and its pitch/roll ride
// the terrain, so the model needs no ground offset of its own.
//
// Proportions and block layout are MEASURED from docs/harvester.3mf (see
// provenance.ts); the cutter boom and cab are film-derived additions.

export { PROVENANCE } from './provenance'

export const OVERALL = {
  /** Full footprint: cutter tip (-36) to the tail face (+24). The hull alone
   *  (measured from the 3MF) is 48m; the film's cutter reaches 12m past it. */
  length: 60,
  /** Over the two track pods: x = +-17.1. */
  width: 34.2,
  /** Cab roof above the ground line; the deck sits at 14.2. */
  height: 17.2,
  /** Pod centre to pod centre. */
  trackSpan: 28,
  /** One pod's thickness across the machine. */
  trackWidth: 6.2,
  /** Sprocket/idler radius on the pod faces. */
  wheelRadius: 2.2,
  /** Terrain-sampling front-rear distance. */
  wheelbase: 38,
} as const

/** The centre hull between the two pods. */
export const BODY = {
  /** Hull half-width: the gap between the pods' inner faces. */
  halfWidth: 10.9,
  deckTop: 14.2,
  deckThickness: 2.5,
  /** Underframe slab near the ground, so the mid-section reads open-framed. */
  underThickness: 2.0,
  /** Hull z, nose face to tail face. */
  noseZ: -24,
  tailZ: 24,
  /** Solid nose block: x from noseZ to noseBlockAftZ (measured from the 3MF). */
  noseBlockAftZ: -15.7,
  /** Solid tail block: x from tailBlockForeZ to tailZ. */
  tailBlockForeZ: 18.3,
} as const

/** The forward cutter: a low arm ahead of the nose with a wide blunt head. */
export const BOOM = {
  tipZ: -36,
  /** Arm centre height above the ground line. */
  y: 4.5,
  halfWidth: 4,
  cutterHalfWidth: 6,
} as const

/** The raised control cab on the forward deck. No interior by design. */
export const CAB = {
  zCenter: -10,
  topY: 17.2,
  halfWidth: 2.6,
  halfDepth: 3,
} as const

/** One track pod, running the full length at x = +-trackSpan/2. */
export const TRACK = {
  centreX: OVERALL.trackSpan / 2,
  /** Wheel stations along the pod. */
  wheelsZ: [-18, -9, 0, 9, 18],
  /** Pod top; the deck sits just above it. */
  podTopY: 14.0,
} as const
