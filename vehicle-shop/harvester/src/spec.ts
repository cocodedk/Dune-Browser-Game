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

/** I6 palette delta (immediate-improvements §6): the SIXTH material — a
 *  lighter trim tone for deck edges, cab window frames and equipment
 *  highlights, so the body/accent/dark triad gains a legible top note. */
export const TRIM_COLOR = 0xd4c8a0

export const OVERALL = {
  /** Full footprint: cutter tip (-36) to the tail face (+24). The hull alone
   *  (measured from the 3MF) is 48m; the film's cutter reaches 12m past it. */
  length: 60,
  /** Over the two treads: widened with the belt so the belt reads as the
   *  carrier, not a narrow band the wheels overhang. */
  width: 31.6,
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

/** The forward cutter: a wide low grinder assembly ahead of the nose. It
 *  sits LOW — the film's cutter dips into the sand, a dozer blade, not a
 *  mid-air boom (user direction: "lower the front loader"). */
export const BOOM = {
  tipZ: -36,
  /** Arm centre height above the ground line. */
  y: 3.0,
  halfWidth: 7,
  cutterHalfWidth: 9,
  /** I3 art-director numbers (immediate-improvements §3): the grinder head
   *  grows to 8 m tall, with a visible rotating DRUM along X at its front
   *  face — the machine's mouth, its most prominent feature. */
  headHeight: 8,
  drumRadius: 1.5,
} as const

/** The raised control cab on the forward deck. No interior by design.
 *  I4 art-director delta: halfWidth 3.5 -> 5.5 (7 m -> 11 m) — a control
 *  station commanding a 31.6 m machine, not a shed (immediate-improvements
 *  §4; the blind panel read "no visible cab" at 7 m). */
export const CAB = {
  zCenter: -8,
  topY: 15,
  halfWidth: 5.5,
  halfDepth: 3.5,
} as const

/** One track assembly — the "tractor". A tall belt loop with SHORT GROUSER
 *  teeth at its lower face (not full-height cleats — those read as a fence
 *  and hid the wheels), big toothed end sprockets, road wheels in the lower
 *  run and return rollers up top. Wheels protrude well past the belt so the
 *  running gear is the thing you see from the side. All of it sits on the
 *  ground line and runs the hull's full length at x = +-trackSpan/2. */
export const TRACK = {
  centreX: OVERALL.trackSpan / 2,
  /** The belt loop: the tall band wrapping the running gear. Widened in the
   *  wheel-above-belt round — the belt is now the machine's ground contact
   *  medium, the wheels ride ON it. */
  belt: { width: 4.6, height: 7.8, outerWidth: 6.8, zLow: -24, zHigh: 24 },
  /** The Y-centre of both sprockets — they sit ON the belt's bottom plate,
   *  so this is bottom-thickness + sprocketRadius. Every other wheel's
   *  Y-centre falls out of this value. */
  sprocketY: 4.1,
  /** Road wheels: the big lower-run wheels inside the belt. Spaced so NO
   *  wheel overlaps another or the end sprockets (they did — the front and
   *  rear clusters collided). */
  roadWheelRadius: 3.0,
  roadWheelsZ: [-14, -4.7, 4.7, 14],
  /** End sprockets: large, toothed, at the belt's fore and aft ends. */
  sprocketRadius: 3.2,
  sprocketZ: [-20.5, 20.5],
  /** Small return rollers carrying the belt's top run, IN the gaps between
   *  the road wheels. */
  returnRollerRadius: 1.2,
  returnRollersZ: [-9.35, 0, 9.35],
  /** Housing over the running gear, tucked under the deck. Raised with the
   *  belt and widened to match. */
  housing: { yLow: 8.0, yHigh: 11.0, width: 4.6 },
  /** Grouser teeth across the belt's LOWER outer face — tread, not a fence. */
  grouserCount: 24,
  /** Chain-link density — I1 pass-2 ruling (critic finding: two densities
   *  left a link-size step at every tangent; user delegated the fix): ONE
   *  link geometry everywhere, like a real caterpillar chain. 29 links per
   *  straight run (pitch ≈ 1.44 m, link ≈ 1.14 m, gap ≈ 0.3 m) and 8 wrap
   *  links per sprocket (arc pitch π·3.65/8 ≈ 1.43 m — the same rhythm),
   *  each wrap link IDENTICAL to a straight link, the arc faceted. */
  beltLinks: { straightPerRun: 29, wrapPerSprocket: 8 },
} as const
