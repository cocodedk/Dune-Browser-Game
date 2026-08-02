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
// Round 2 amendment: the 3MF's chunky 1.4:1 plan read as a box to the user's
// eye ("very weird, not clear what it is"); the film's LONG-LOW proportions
// now win. Width over tracks 34.2 -> 29, deck 14.2 -> 12.0, the pods rebuilt
// as running gear (band + wheels + housing), the cutter enlarged to a real
// grinder. Recorded in provenance.ts so the measured numbers are not
// silently re-asserted over the eye.

export { PROVENANCE } from './provenance'

export const OVERALL = {
  /** Full footprint: cutter tip (-36) to the tail face (+24). The hull alone
   *  (measured from the 3MF) is 48m; the film's cutter reaches 12m past it. */
  length: 60,
  /** Over the two treads: x = +-14.5. */
  width: 29,
  /** Cab roof above the ground line; the deck sits at 12.0. */
  height: 15,
  /** Pod centre to pod centre. */
  trackSpan: 24,
  /** One pod's thickness across the machine. */
  trackWidth: 5,
  /** Sprocket/idler radius — big, so the running gear reads. */
  wheelRadius: 2.8,
  /** Terrain-sampling front-rear distance. */
  wheelbase: 38,
} as const

/** The centre hull between the two pods. */
export const BODY = {
  /** Hull half-width: the gap between the pods' inner faces. */
  halfWidth: 9.5,
  deckTop: 12.0,
  deckThickness: 2.5,
  /** Underframe slab near the ground, so the mid-section reads open-framed. */
  underThickness: 2.0,
  /** Hull z, nose face to tail face. */
  noseZ: -24,
  tailZ: 24,
  /** Forward housing: solid block under the deck behind the cutter. */
  noseBlockAftZ: -15.7,
  /** Rear housing: low processing tower at the tail. */
  tailBlockForeZ: 19,
} as const

/** The forward cutter: a wide low grinder assembly ahead of the nose. */
export const BOOM = {
  tipZ: -36,
  /** Arm centre height above the ground line. */
  y: 6,
  halfWidth: 7,
  cutterHalfWidth: 9,
} as const

/** The raised control cab on the forward deck. No interior by design. */
export const CAB = {
  zCenter: -8,
  topY: 15,
  halfWidth: 3.5,
  halfDepth: 3.5,
} as const

/** One track assembly, centred on the same z-range as the hull. */
export const TRACK = {
  centreX: OVERALL.trackSpan / 2,
  /** Wheel stations along the band, 7 per side. */
  wheelsZ: [-20, -13.3, -6.7, 0, 6.7, 13.3, 20],
  /** Tread band: the continuous dark belt under the wheels. */
  band: { zLow: -24, zHigh: 24, yLow: 0, yHigh: 3.2 },
  /** Upper housing over the running gear, tucking under the deck. */
  housing: { yLow: 6.0, yHigh: 11.0, width: 4.2 },
} as const
