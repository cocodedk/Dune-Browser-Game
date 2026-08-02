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

/** One track assembly — the "tractor". A tall belt loop with full-height
 *  cleats, big toothed end sprockets, road wheels in the lower run and
 *  return rollers up top. All of it sits on the ground line and runs the
 *  hull's full length at x = +-trackSpan/2. */
export const TRACK = {
  centreX: OVERALL.trackSpan / 2,
  /** The belt loop: the tall dark band wrapping the running gear. */
  belt: { width: 4.6, height: 7.0, zLow: -24, zHigh: 24 },
  /** Road wheels: the big lower-run wheels inside the belt. */
  roadWheelRadius: 3.0,
  roadWheelsZ: [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5],
  /** End sprockets: large, toothed, at the belt's fore and aft ends. */
  sprocketRadius: 3.2,
  sprocketZ: [-21, 21],
  /** Small return rollers carrying the belt's top run. */
  returnRollerRadius: 1.2,
  returnRollersZ: [-18, -9, 0, 9, 18],
  /** Housing over the running gear, tucked under the deck. */
  housing: { yLow: 7.2, yHigh: 11.0, width: 4.4 },
  /** Transverse cleats across the belt's outer face — the segmented belt read. */
  cleatCount: 18,
} as const
