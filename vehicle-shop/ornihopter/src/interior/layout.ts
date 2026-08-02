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
 * The control column. thopter-03's most identifiable silhouette is not a post
 * on the floor — it is a multi-jointed arm coming DOWN from the overhead
 * structure with a coiled cable following it and a bulbous grip at the end,
 * and round 6's critic named its absence ("a bare untapered post with a flat
 * cap"). Mounted on the brow beam and reaching down and forward to the hand,
 * so most of its run is inside the forward frame rather than under it: at the
 * new eye height a stick rising off the floor between the knees sits about 48
 * degrees below level, well outside a 34-degree half-VFOV, and would be
 * invisible however well it were modelled.
 */
export const STICK = {
  // Grips sit OUTBOARD of their own seat, and that is a measured decision, not
  // a stylistic one. Built first at the seat's own x and then 0.2m inboard of
  // it: at both, the arm hangs 0.6-1.0m from the eye — arm's length, which in
  // a 68-degree field is a 100-pixel-wide tube — straight across the window,
  // and the capture showed two of them crossing the frame like pipework. At
  // 0.34m outboard the arm runs down the frame's port edge between 19 and 40
  // degrees off the nose, clear of a window that starts about 5 degrees to
  // port, and the copilot's mirrors out past the frame's own 47-degree edge.
  pilotGrip: { x: seatX(-1) - 0.34, y: 0.72, z: stationFromNose(2.9) },
  copilotGrip: { x: seatX(1) + 0.34, y: 0.72, z: stationFromNose(2.9) },
  mountY: roofYAt(stationFromNose(2.42)) - 0.2,
  mountZ: stationFromNose(2.42),
  // Slimmed from 0.045/0.085 for the same reason: at arm's length the old
  // radii read as plumbing rather than as a control run.
  shaftRadius: 0.03,
  gripRadius: 0.075,
} as const

const OVERHEAD_Z = stationFromNose(2.45)

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
