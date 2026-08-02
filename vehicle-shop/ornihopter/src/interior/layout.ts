// vehicle-shop/ornihopter/src/interior/layout.ts
// Every interior position in one place, so seats/console/sticks/overhead/walls
// cannot quietly disagree about where things are. Numbers are either taken
// directly from spec.ts (the contract, read-only) or authored here to fit
// inside it — each authored number says why.
//
// MEASURED CONSTRAINT (see tools/frustum-check in the build notes, reproduced
// by projecting through a PerspectiveCamera(68, 1.6, 0.25, 6000) at
// PILOT_EYE, matching camera/cameraRig.ts's pilot mode exactly, at the
// 1600x1000 capture size tools/shoot.mjs uses): PILOT_EYE.z sits only 0.15m
// forward of COCKPIT.seatZ, so the ENTIRE z=seatZ plane — both seat pans,
// mirrored in x alike — has camera-space z > 0 and is behind the camera,
// full stop, regardless of x. That is exactly what keeps the pilot from
// seeing their own seatback (correct, and clearly intentional), but it also
// hides the copilot's seat, which the bar separately wants visible to the
// side. The two requirements are in tension for any object sitting at
// z=seatZ. Nothing forward of roughly z <= -9.25 (i.e. at or past the
// console) and inboard of roughly x <= 1.1 clears the frame at 1600x1000;
// nothing further aft does, at any x. See Cockpit.ts's file header for the
// mitigation this drove and interior/frustum.test.ts for the assertions.

import { COCKPIT, OVERALL, BODY, PILOT_EYE, stationFromNose } from '../spec'
import { ridgeHeightAt } from '../model/geometry/canopyGeometry'
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
 * forward (toward the nose) from there. That reading keeps the console's
 * nearest, tallest point at the shallowest angle below the pilot's sightline
 * rather than the steepest, which is what leaves the horizon visible above
 * it (see the measured constraint above: the near-top edge sits ~27 degrees
 * below level, comfortably inside the camera's 34-degree half-VFOV).
 */
const CONSOLE_DEPTH = 0.55
const CONSOLE_FAR_Z = COCKPIT.consoleZ - CONSOLE_DEPTH
/**
 * FOUND, round 6a: the console is a BOX, and its forward-lower corners hung
 * outside the pod's tucked forward flank — rendering as a small black
 * rectangle, complete with one green switch tile, on the nose in every side,
 * hero and rear-3/4 capture. It had been there for rounds, reading as a hull
 * greeble. Two separate causes: this half-width (2.1m, against a hull that is
 * 1.03m at the console's forward-lower corner) and console.ts's dial row,
 * which was hard-coded wider still at x = -1.9.
 *
 * Both are now derived rather than typed. The base rises to sit clear of the
 * keel, and the width is read off the hull's own interior AT THAT CORNER via
 * the same hullSection.ts helper cabinShell.ts's floor and walls use — so the
 * console cannot outgrow the hull again, and it tracks any future change to
 * the station table automatically.
 *
 * NOT the whole fix: a box in a tucked wedge can only ever be as wide as its
 * narrowest corner, so the dash is narrower than it should be. The real answer
 * is a console that tapers with the hull, which is console geometry and
 * belongs to the interior round.
 */
const CONSOLE_BASE_Y = COCKPIT.floorY + 0.75
const CONSOLE_HALF_WIDTH = Math.min(1.3, hullInteriorHalfWidthAt(CONSOLE_BASE_Y, CONSOLE_FAR_Z))

export const CONSOLE = {
  nearZ: COCKPIT.consoleZ,
  depth: CONSOLE_DEPTH,
  farZ: CONSOLE_FAR_Z,
  topY: COCKPIT.floorY + COCKPIT.consoleHeightAboveFloor,
  baseY: CONSOLE_BASE_Y,
  halfWidth: CONSOLE_HALF_WIDTH,
  /**
   * The copilot-side instrument cluster has to sit in the FAR (nose-ward)
   * strip of the console, not the near strip, or it falls outside the
   * camera frustum — measured: near-edge visible x tops out at ~0.61 at
   * 1600x1000, but the far edge (deeper, so the cone has widened) clears
   * past 1.0. This is the one place on the copilot's side that is visible
   * at all in the fixed pilot-cam frame.
   */
  copilotClusterXMin: Math.min(0.65, CONSOLE_HALF_WIDTH - 0.3),
  copilotClusterXMax: Math.min(1.05, CONSOLE_HALF_WIDTH - 0.06),
  copilotClusterZMin: -9.88,
  copilotClusterZMax: -9.7,
} as const

export const STICK = {
  // Each stick sits at its OWN seat's x, close to the knees — the
  // ergonomically correct place. Earlier rounds pulled both sticks inward to
  // a shared centre pedestal because the fixed forward camera could never
  // see the copilot's own x at all. That workaround is obsolete: the pilot
  // can now turn their head up to 100 degrees (camera/cameraRig.ts
  // lookAround, held H or right-drag), which is the honest fix for a seat
  // the forward view was never going to contain — see frustum.test.ts for
  // what the fixed forward frame does and does not show.
  pilotGrip: { x: seatX(-1), y: -0.5, z: -8.75 },
  copilotGrip: { x: seatX(1), y: -0.55, z: -9.15 },
  shaftRadius: 0.035,
  gripRadius: 0.07,
} as const

const OVERHEAD_Z = -9.15

export const OVERHEAD = {
  // Centred slightly toward the pilot's side (x=-0.05, not 0) because the
  // pilot's eye itself sits off-centre at x=-0.85 looking straight down -Z
  // with no toe-in, which shifts the whole visible cone right of the craft
  // centreline; centring the panel exactly on x=0 clips its right edge.
  x: -0.05,
  halfWidth: 0.28,
  z: OVERHEAD_Z,
  panelBottomY: 0.175,
  panelTopY: 0.525,
  // The mount's top is the canopy's own ridge beam at this z, not an
  // independently-guessed height — see canopyGeometry.ts's ridgeHeightAt.
  // Round 1 hung this panel from a stalk that exited the top of frame with
  // no ceiling anywhere; this is the fix, not a cosmetic tweak.
  mountTopY: ridgeHeightAt(OVERHEAD_Z),
} as const

export const WALL = {
  halfX: COCKPIT.clearWidth / 2 - 0.15,
  ceilingY: COCKPIT.floorY + COCKPIT.clearHeight,
  // The greeble strip only reads in-frame forward of roughly z=-9.5; aft of
  // that (beside the seats) it is in the same hidden zone as the seats
  // themselves, so there is no point detailing it.
  greebleZMin: -10.5,
  greebleZMax: -9.5,
} as const

export const NOSE_Z = -OVERALL.length / 2
export const CABIN_BOUNDARY_Z = stationFromNose(BODY.cockpitLength)
export const FLOOR_FRONT_Z = NOSE_Z + 0.45
export const FLOOR_REAR_Z = CABIN_BOUNDARY_Z - 0.1
