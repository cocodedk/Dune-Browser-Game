// vehicle-shop/ornihopter/src/spec.ts
// The single source of truth for the craft's dimensions. Every builder reads
// this; nobody edits it except the lead. It exists so the geometry, the
// cockpit interior and the flight model cannot disagree about how big the
// craft is or where the pilot sits.
//
// Units are metres, one metre per three.js unit.
//
// AXIS CONVENTION, stated once and asserted in tests:
//   -Z is FORWARD (the nose).  +Y is UP.  +X is the craft's RIGHT (starboard).
// This matches three.js's own "a camera looks down -Z" convention. The
// previous in-game ornithopter shipped for months flying tail-first because
// its yaw helper aimed +Z along the direction of travel while the hull was
// modelled nose-along -Z. Nothing here prevents that by itself — the guard is
// the correctness test that asserts dot(noseWorld, velocityDirection) ~ +1.

export { PROVENANCE } from './provenance'

export const OVERALL = {
  length: 22.896,
  span: 51.84,
  bodyWidth: 5.4,
  bodyHeight: 4.3,
  /** Overall height parked on the gear, NOT clearance to the hull underside —
   *  see PROVENANCE.landedHeight. RE-MEASURED round 6d at 6.747; the 7.582 it
   *  replaces was measured before round 6a deleted the tent canopy. */
  landedHeight: 6.747,
} as const

/** Longitudinal stations, measured from the nose at z = 0 going aft (+z aft). */
export const BODY = {
  cockpitLength: 5.8,
  cabinLength: 9.2,
  tailLength: 7.896,
  rampWidth: 2.8,
  rampLength: 3.3,
} as const

/**
 * Nose sits at z = -HALF_LENGTH, tail at z = +HALF_LENGTH, origin amidships.
 * Everything positional below is expressed in this frame.
 */
export const HALF_LENGTH = OVERALL.length / 2

/** Station z for a distance aft of the nose. */
export function stationFromNose(metresAft: number): number {
  return -HALF_LENGTH + metresAft
}

export const WING = {
  count: 8,
  perSide: 4,
  /**
   * Distance from the wing's root pivot to its tip. The pivot sits on the hull
   * flank, so this is the half-span minus the half-body-width.
   */
  reach: OVERALL.span / 2 - OVERALL.bodyWidth / 2,
  /** Measured 20.69:1 on the kit plate. */
  lengthOverMaxChord: 20.69,
  /**
   * Normalised chord at 20 stations from root (0) to tip (1), measured off the
   * kit's wing plate. The first three stations are the narrow root arm, not
   * blade. Interpolate this; do not re-invent a linear taper.
   */
  chordProfile: [
    1.0, 0.46, 0.327, 0.696, 0.987, 0.987, 0.987, 0.987, 0.987, 0.987,
    0.987, 0.987, 0.987, 0.987, 0.987, 0.987, 0.987, 0.906, 0.767, 0.625,
  ],
  /**
   * Offset of the blade's centreline from the plate's mid-line, at the same 20
   * stations, as a fraction of max chord. The blade BOWS: it sits well toward
   * one edge at the root, crosses over across the constant-chord midspan, and
   * returns near the tip.
   *
   * Measured off the same kit plate as chordProfile, at 88 stations, then
   * resampled to 20 — see docs/profiles/wing-planform.json and
   * tools/plate-to-outline.mjs. Corroborated by the assembled kit photograph
   * (.shots/reference/kit-assembled.png), where the blades visibly curve.
   *
   * This was missing until now, and its absence is why the wings are built
   * straight. chordProfile records only WIDTH, so a builder reading spec.ts
   * had no way to know the centreline moves at all.
   */
  sweepProfile: [
    0.233, 0.207, 0.242, 0.057, -0.064, -0.064, -0.064, -0.064, -0.064, -0.064,
    -0.064, -0.064, -0.064, -0.064, -0.064, -0.064, -0.064, -0.022, 0.041, 0.12,
  ],
  /** Fraction of reach taken up by the root arm before the blade proper starts. */
  rootArmFraction: 0.17,
  thickness: 0.08,
  /** Sweep of each of the four blades on a side, fanning fore-to-aft. */
  sweepDeg: [16, 5, -5, -16],
  /** Half-angle of the flap arc; total travel is twice this. */
  flapHalfAngleDeg: 10,
  featherAmplitudeDeg: 22,
} as const

export const WING_MAX_CHORD = WING.reach / WING.lengthOverMaxChord

/**
 * One wing root. See PROVENANCE.wingRoots: the kit's two transverse frames
 * give two STATIONS, each carrying a deck-edge arm and a flank arm per side.
 *
 * There is deliberately no `y` here any more. The old table carried one, and
 * it was never where the wing actually attached — geometry/wing/rootPod.ts's
 * seatOnHull has found the real surface point by bisection since round 3, and
 * Ornithopter.ts has used that. A second, stale height in the spec was a
 * standing invitation for the two to disagree.
 */
export interface WingRootMount {
  readonly z: number
  /** `deck` arms seat by X fraction of the local half-width; `flank` arms seat
   *  by Y fraction of the local half-height, off that station's keel line. */
  readonly arm: 'deck' | 'flank'
  readonly seatFraction: number
}

/** Frame stations, 5.30m apart, centred on the 9.8m beam peak. */
const FRAME_FORWARD = stationFromNose(9.8 - 2.65)
const FRAME_AFT = stationFromNose(9.8 + 2.65)

export const WING_ROOTS: readonly WingRootMount[] = [
  { z: FRAME_FORWARD, arm: 'deck', seatFraction: 0.72 },
  { z: FRAME_FORWARD, arm: 'flank', seatFraction: -0.3 },
  { z: FRAME_AFT, arm: 'deck', seatFraction: 0.72 },
  { z: FRAME_AFT, arm: 'flank', seatFraction: -0.34 },
]

export const WING_ROOT_X = OVERALL.bodyWidth / 2

/**
 * Cockpit interior. AUTHORED — see PROVENANCE.interior and, for floorY and
 * seatOffsetX, PROVENANCE.flightDeck. The seated proportions are ordinary
 * anthropometry (0.45m pan above the floor, 1.2m pan to eye); what round 6b
 * re-derived is where that seated body has to SIT for its level sightline to
 * leave the craft through glass. interior/eyeLine.test.ts asserts the
 * derivation against canopyPlan.ts rather than trusting these literals.
 */
export const COCKPIT = {
  /** Cabin floor height relative to the craft origin. DERIVED, round 6b, from
   *  the canopy's own rake and from the interior roof's mullion spacing — the
   *  full derivation and the two numbers it was solved against are in
   *  PROVENANCE.flightDeck, and interior/eyeLine.test.ts re-checks it against
   *  canopyPlan.ts every run. Was -1.80, which put the eye 2.26m below the deck
   *  and a level sightline out through the bullnose. */
  floorY: -0.53,
  seatPanAboveFloor: 0.45,
  eyeAbovePan: 1.2,
  /** Lateral offset of each of the two front seats from the centreline.
   *  DERIVED, round 6b, down from 0.85: the canopy is only 0.42-0.78m
   *  half-wide over its glazed forward bay, so a pilot at 0.85 looked into
   *  opaque deck plate at every seated eye height there is. See
   *  PROVENANCE.flightDeck for why 0.38 and not 0.62. */
  seatOffsetX: 0.38,
  seatWidth: 0.64,
  seatBackHeight: 1.1,
  /** Seat reference point, measured aft of the nose. */
  seatZ: stationFromNose(3.6),
  /** Instrument console front face, aft of the nose. Brought 0.45m nearer the
   *  crew and raised 0.10m in round 6b: with the eye at 1.30 the old station
   *  put the dash 20-27 degrees below level, a thin strip across the frame.
   *  From here it spans 20-30 degrees and reads as a panel you are sitting at. */
  consoleZ: stationFromNose(2.55),
  consoleHeightAboveFloor: 1.05,
  /** Interior clear width and height, inside the shell. MEASURED off the hull
   *  section at the cockpit, not derived from the overall envelope: the floor
   *  now sits at -0.38 and the deck over it at 2.107, so the clear height is
   *  2.45, not the 3.6 an envelope-minus-skin guess gave. canopyPlan.ts reads
   *  clearHeight for CANOPY_SIDE_SILL_Y, so an honest number here is what
   *  puts the side rail at a shoulder line instead of over the pilot's head. */
  clearWidth: 4.6,
  clearHeight: 2.45,
} as const

/** Pilot eye point in craft-local space — the pilot camera sits exactly here. */
export const PILOT_EYE = {
  x: -COCKPIT.seatOffsetX,
  y: COCKPIT.floorY + COCKPIT.seatPanAboveFloor + COCKPIT.eyeAbovePan,
  z: COCKPIT.seatZ - 0.15,
} as const

export const GEAR = {
  strutLength: 3.0,
  footLength: 1.3,
  /** Stations aft of the nose for the three gear legs per side. */
  stationsFromNose: [4.2, 7.8, 11.4],
} as const
