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

/** Where each number came from, so a later round can re-derive rather than guess. */
export const PROVENANCE = {
  overall:
    "MENG's licensed 1:72 kit, 720mm span x 318mm long at 1:72 -> 51.84m x 22.896m. " +
    'docs/info.md rates this High confidence.',
  wingCount:
    'MEASURED from the MakerWorld print kit in docs/: the standard kit lays out ' +
    '8 x Wing_full_size.stl, and Wings_Fullscale_Kit.3mf lays out 4 x l1 + 4 x r1. ' +
    'Eight wings, four per side. A top-down photograph reads as three per side ' +
    'because blades overlap at that angle — the kit part count is the primary source.',
  wingPlanform:
    'MEASURED from docs/ Wing_Fullscale_left.stl (197.66 x 12.37 x 2.02mm plate): ' +
    'length/maxChord = 20.69, chord near-constant over the middle 60% of span and ' +
    'tapering only near the tip. This CONTRADICTS docs/info.md maxChord 2.5m / ' +
    'tipChord 0.35m, which came from a University of Leicester actor-comparison ' +
    'estimate, not from the licensed kit. The measured planform also matches the ' +
    'Master Replicas reference photographs, which show very slender blades.',
  interior:
    'AUTHORED, not sourced. docs/info.md gives only "two pilots in front, larger ' +
    'cabin behind". Seat and eye heights below are ordinary human seated ' +
    'anthropometry fitted to the measured cabin volume. Concept art at ' +
    '.shots/reference/thopter-03.jpg and thopter-04.jpg is the visual reference.',
} as const

export const OVERALL = {
  length: 22.896,
  span: 51.84,
  bodyWidth: 5.4,
  bodyHeight: 4.3,
  /** Ground clearance to hull underside with the gear extended. */
  landedHeight: 7.2,
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
 * Wing root pivots, on the hull flank. x is mirrored per side; z fans the four
 * blades along the shoulder so they are not stacked on one line.
 */
export const WING_ROOTS = [
  { z: stationFromNose(7.4), y: 0.9 },
  { z: stationFromNose(9.0), y: 0.9 },
  { z: stationFromNose(10.6), y: 0.75 },
  { z: stationFromNose(12.2), y: 0.75 },
] as const

export const WING_ROOT_X = OVERALL.bodyWidth / 2

/**
 * Cockpit interior. AUTHORED — see PROVENANCE.interior. The numbers are chosen
 * so a 1.8m human fits: 0.45m seat pan above the cabin floor, 1.2m from pan to
 * eye. The pilot camera goes at EYE, and the correctness bar asserts that point
 * lies inside the cabin shell with the canopy in front of it.
 */
export const COCKPIT = {
  /** Cabin floor height relative to the craft origin. */
  floorY: -OVERALL.bodyHeight / 2 + 0.35,
  seatPanAboveFloor: 0.45,
  eyeAbovePan: 1.2,
  /** Lateral offset of each of the two front seats from the centreline. */
  seatOffsetX: 0.85,
  seatWidth: 0.7,
  seatBackHeight: 1.1,
  /** Seat reference point, measured aft of the nose. */
  seatZ: stationFromNose(3.6),
  /** Instrument console front face, aft of the nose. */
  consoleZ: stationFromNose(2.1),
  consoleHeightAboveFloor: 0.95,
  /** Interior clear width and height, inside the shell. */
  clearWidth: OVERALL.bodyWidth - 0.5,
  clearHeight: OVERALL.bodyHeight - 0.7,
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
