// vehicle-shop/ornihopter/src/interior/layout.ts
// Every interior position in one place, so seats/console/sticks/overhead/walls
// cannot quietly disagree about where things are. Numbers are either taken
// directly from spec.ts (the contract, read-only) or authored here to fit
// inside it — each authored number says why. The roof and its window live in
// canopyLayout.ts; parts import whichever of the two they actually need.
//
// MEASURED CONSTRAINT, re-derived for round 6b's raised flight deck by
// projecting through a PerspectiveCamera(68, 1.6, 0.25, 6000) at PILOT_EYE,
// matching camera/cameraRig.ts's pilot mode at tools/shoot.mjs's 1600x1000:
// PILOT_EYE.z still sits only 0.15m forward of COCKPIT.seatZ, so the entire
// z=seatZ plane — both seat pans, the copilot figure — is behind the camera at
// yaw 0 whatever its x. That is what keeps the pilot from seeing their own
// seatback, and it is why the second seat is reachable only by turning the
// head (camera/cameraRig.ts's lookAround). What HAS changed is everything
// vertical: the eye is at 1.30 rather than -0.15, so the console, the control
// column and the overhead panel are all re-placed against it below.

import { COCKPIT, OVERALL, BODY, PILOT_EYE, stationFromNose } from '../spec'
import { APERTURE_FORE_Z, roofYAt } from './canopyLayout'
import { hullInteriorHalfWidthAt } from './hullSection'

export const EYE = PILOT_EYE

/** Seat cushion top surface, where the pilot's weight actually rests. */
export const PAN_Y = COCKPIT.floorY + COCKPIT.seatPanAboveFloor

/** Side multiplier: -1 is the pilot (port, -X), +1 is the copilot (starboard). */
export type Side = -1 | 1
export const seatX = (side: Side): number => side * COCKPIT.seatOffsetX

export const SEAT = {
  panDepth: 0.5,
  panThickness: 0.12,
  backThickness: 0.12,
  halfWidth: COCKPIT.seatWidth / 2,
  frontZ: COCKPIT.seatZ - 0.25,
  rearZ: COCKPIT.seatZ + 0.25,
  backTopY: PAN_Y + COCKPIT.seatBackHeight,
} as const

/**
 * consoleZ (spec) is read as the console's PILOT-FACING edge — the face
 * closest to the seats, where the instruments are — with the body extending
 * forward from there. That reading keeps the console's nearest, tallest point
 * at the shallowest angle below the sightline rather than the steepest.
 *
 * MEASURED at the new eye height: the near-top edge sits about 30 degrees
 * below level and the far edge about 20, so the dash fills the lower third of
 * the frame instead of the thin strip it read as when the eye sat 1.45m lower
 * and the whole panel foreshortened into a line.
 *
 * FIXED, round 6b. Round 6a made the console's half-width hull-derived, which
 * stopped it hanging outside the pod — but it took ONE width, at the box's
 * narrowest corner, so the dash came out 2.17m wide with an empty third on the
 * pilot's left and a see-through gap where it should have met the sill. A box
 * in a tucked wedge can only ever be as wide as its narrowest corner; the
 * answer is not a box. halfWidthAt reads the hull at the dash's own height AT
 * EVERY STATION, so the console tapers with the wedge and lands on the side
 * liner at both ends of its run — the same function the wall's own panels use,
 * so "the dash meets the sill" is one number rather than two that agree.
 */
const CONSOLE_DEPTH = 0.75
const CONSOLE_FAR_Z = COCKPIT.consoleZ - CONSOLE_DEPTH
const CONSOLE_TOP_Y = COCKPIT.floorY + COCKPIT.consoleHeightAboveFloor

export const CONSOLE = {
  nearZ: COCKPIT.consoleZ,
  depth: CONSOLE_DEPTH,
  farZ: CONSOLE_FAR_Z,
  topY: CONSOLE_TOP_Y,
  baseY: COCKPIT.floorY + 0.32,
  /** Coaming lip standing proud of the dash's near edge. */
  coamingRise: 0.13,
  halfWidthAt(z: number): number {
    return Math.max(0, hullInteriorHalfWidthAt(CONSOLE_TOP_Y, z) - 0.015)
  },
  /** Station the pilot's own instrument cluster sits on. */
  panelZ: COCKPIT.consoleZ - 0.24,
} as const

/**
 * ROUND 9c. Replaces the round-6b brow-hung arm: round 7's critic named it
 * "one smooth, unbroken cylinder... a ball on its FLANK, not its end", and
 * the user's AH-64E ruling wants a stick between the knees, not one hanging
 * from the roof. See cyclic.ts for why this is legible from the eye at all —
 * a plain floor-mounted post was the round-6b problem, not solved by moving
 * the mount, only by keeping the visible part inside the safe band below.
 *
 * MEASURED for THIS cockpit's eye height: three's projection puts a point's
 * screen row at atan(dy/dz) from PILOT_EYE regardless of its x (only -z is in
 * the denominator, so a lateral lean does not change how low something
 * reads). Visibility needs dy/dz < tan(34deg); clearing forwardCone.test.ts's
 * cone needs dy/dz > tan(6deg). At the ~0.7-0.85m gap between the console's
 * near face and the seat front — the only place a floor-rising cyclic CAN
 * stand — that is a band of roughly y in (0.6, 1.0). Every station's comment
 * is its own elevation below level from PILOT_EYE, straight ahead (yaw 0,
 * pitch 0), so a future mover can see how much margin they are spending.
 */
export const CYCLIC = {
  pivot: { x: seatX(-1) + 0.03, y: COCKPIT.floorY, z: stationFromNose(2.78) }, // 68deg: off the bottom of frame, with the seat pans
  knuckle1: { x: seatX(-1) + 0.06, y: 0.5, z: stationFromNose(2.73) }, // 41deg: still below frame — the boot-covered lower shaft
  knuckle2: { x: seatX(-1) + 0.1, y: 0.62, z: stationFromNose(2.69) }, // 33deg: right at the bottom edge
  knuckle3: { x: seatX(-1) + 0.15, y: 0.71, z: stationFromNose(2.66) }, // 27deg
  gripBase: { x: seatX(-1) + 0.21, y: 0.79, z: stationFromNose(2.63) }, // 22deg: top of the last tube, bottom of the grip
  gripTop: { x: seatX(-1) + 0.23, y: 0.92, z: stationFromNose(2.62) }, // 14deg at its own top surface, clear of the 6deg cone
  tubeRadius: 0.026,
} as const

/**
 * The collective, at the pilot's own LEFT hand (x < seat x — see
 * docs/apache-gauntlet.md B4.4; spec.ts's +X is the craft's, and the pilot's
 * own, right). Pivots through the top of the side console (console.ts's
 * sideConsole, x -0.73..-1.25) and rakes aft-down to it from a grip out at
 * hand's reach — "aft-down" read from the grip, which is the end a critic
 * looks at first. Kept well outboard on purpose: at yaw ~-42deg it clears
 * forwardCone.test.ts's +/-10deg cone on BEARING alone, not only on the same
 * elevation margin the cyclic spends.
 */
export const COLLECTIVE = {
  pivot: { x: -0.92, y: 0.6, z: stationFromNose(3.1) }, // 56deg down, 57deg off-axis: inside the console's own shadow
  grip: { x: -0.88, y: 0.95, z: stationFromNose(2.9) }, // 17deg down, 42deg off-axis
  leverRadius: 0.024,
} as const

// ROUND 9e: was 2.45m aft, which WAS the brow station — the aperture's aft
// edge. The aperture now runs to 4.6m aft (canopyLayout.ts), so a panel left
// at 2.45 would hang in the middle of the new glazing, dead over the
// windscreen. MEASURED at pitch 0 before the move: this panel alone was the
// first opaque hit for 216 of 2560 rays — 8.4% of the pilot's frame, all of
// it top-centre where the sky now is. At 3.0m aft it hangs off the mullion
// arch (canopyLayout.ts's mullionStations() puts one on that canopy station),
// 0.45m ahead of the eye and 0.93m above it: 60-odd degrees up, out of a
// 34-degree half-VFOV entirely, and found by looking up — where an overhead
// console is found in the aircraft this is referenced to.
const OVERHEAD_Z = stationFromNose(3.0)

export const OVERHEAD = {
  // Centred slightly toward the pilot's side because the eye itself is
  // off-centre at x = -0.62 looking straight down -Z with no toe-in, which
  // shifts the visible cone to starboard of the craft centreline.
  x: -0.18,
  halfWidth: 0.32,
  z: OVERHEAD_Z,
  // Hung from the roof liner itself now, not from a stalk reaching up to a
  // ridge beam that no longer exists: the canopy is a deck panel and
  // canopyFrame.ts's liner is the ceiling this bolts to.
  mountTopY: roofYAt(OVERHEAD_Z) - 0.01,
  panelTopY: roofYAt(OVERHEAD_Z) - 0.05,
  // MEASURED and raised. At a 0.42m drop and 0.5m depth this panel sat 0.7m
  // from the eye and owned rows 0-12 of a 30-row raycast of the pilot frame —
  // about a fifth of the whole view, and most of it over the window. It hangs
  // 0.26m now, which puts its lower edge at 27 degrees against a 34-degree
  // half-VFOV: present at the top of frame, where an overhead panel belongs,
  // rather than across the windscreen.
  panelBottomY: roofYAt(OVERHEAD_Z) - 0.26,
} as const

/**
 * ROUND 9c. The coil conduit used to run beside the control arm; the
 * reference boards hang it from the OVERHEAD console instead, and round 7's
 * "helix wound around it" was partly this cable being read as the stick's own
 * structure. Anchored at OVERHEAD's own underside — so the guard's "attaches
 * to the overhead, not the cyclic" is one shared number — and drooping to
 * just above the panel's flat deck. x sits right of centre, clear of the
 * pilot's own cyclic: at x near the pilot's -0.38 the same droop would cross
 * forwardCone.test.ts's cone at yaw ~10-11deg, exactly where its own midpoint
 * passes through level on its way from above eye height to below it.
 */
export const CONDUIT = {
  // x = 0.2, not the 0.1 first tried: OVERHEAD.z IS the brow station
  // (canopyLayout's APERTURE_REAR_Z), so anything hung from directly under it
  // sits right at the glazing's own aft edge — MEASURED in a capture, 0.1 let
  // the coil's own zigzag swing across that edge into the bright wedge on
  // alternating links. 0.2 sits it inboard on the brow/roof side.
  top: { x: 0.2, y: OVERHEAD.panelBottomY, z: OVERHEAD.z },
  bottom: { x: 0.2, y: CONSOLE.topY + 0.2, z: stationFromNose(2.35) },
} as const

export const WALL = {
  halfX: COCKPIT.clearWidth / 2 - 0.15,
  ceilingY: roofYAt(COCKPIT.seatZ),
  // The band of side liner that actually reads in the forward frame, now that
  // the walls run the full height: beside and just ahead of the pilot.
  greebleZMin: stationFromNose(1.6),
  greebleZMax: stationFromNose(4.4),
} as const

export const NOSE_Z = -OVERALL.length / 2
export const CABIN_BOUNDARY_Z = stationFromNose(BODY.cockpitLength)
/** The floor starts where the nose bulkhead closes the cockpit off, so floor,
 *  walls, roof and bulkhead all begin at one station and cannot leave a strip
 *  of unlined hull between them. */
export const FLOOR_FRONT_Z = APERTURE_FORE_Z
export const FLOOR_REAR_Z = CABIN_BOUNDARY_Z - 0.1
