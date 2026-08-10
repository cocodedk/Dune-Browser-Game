// landscape-shop/sietch/src/model/surface/beddingLift.ts
// WHERE THE COURSES ARE, as opposed to what they are (beds.ts) or how
// deep they cut (bedding.ts). Split off in R2.1 when the three named
// departures below outgrew one 200-line file.
//
// Everything here only ever MOVES the bedding column; nothing here can
// move the massing, because carvedProfile.ts still displaces inward only
// and still gates the four vertices seam.test.ts measures from.

import { smoothstep } from './curves'

// THE DIP IS THE ONE DEPARTURE THAT IS NOT 3x, and the reason is a guard,
// not taste: surfaceMaps.test.ts measures the back wall's across-course
// variation against its along-course variation, and a course that runs
// downhill inside the test's own 6 m window IS along-course variation.
// Measured: 0.057/m scored 2.57 and 0.038/m scores 4.98 against a bar of
// 4.6. 0.038 still tilts a course 1.1 m across the back wall — 57 px of
// rise across the frame, measured off rig-clay.png — so it is plainly not
// level, and the 3-5x amplification the round asked for is carried by the
// swell (4x) and by the fault, which is new.
const DIP_PER_M = 0.038
const SWELL_M = 1.7
// One long fold, not one and a half. Amplitude is what the eye reads;
// CYCLES is how fast a course climbs down the hall, which is what the
// mesh has to follow — 0.09 m per 0.5 m ring here, gentle enough that the
// vault (which cannot place vertices on a boundary) is not asked to
// resolve a moving edge. The swell still falls 2.0 m across the stretch
// of wall the rig can see.
const SWELL_CYCLES = 0.85
const SWELL_PHASE = 0.8
// The break sits at t = 0.26 because that is rock CAMERA_RIG can see:
// measured off the frustum, the side walls leave frame past about
// z = -17 (t = 0.33), so a fault any deeper into the hall would be a
// feature only the geometry knows about. Its drag zone is 5.7 m of hall
// for the same reason the swell is one cycle — 0.95 m of throw taken any
// faster than this the vault could not follow.
const FAULT_AT_T = 0.26
const FAULT_THROW_M = -0.95
const FAULT_BLEND_T = 0.055

/** Metres to raise the whole bedding column at this ground position. */
export function beddingLiftAt(x: number, z: number, depthM: number): number {
  const along = -z / depthM
  const fault = FAULT_THROW_M *
    smoothstep(FAULT_AT_T - FAULT_BLEND_T, FAULT_AT_T + FAULT_BLEND_T, along)
  return -DIP_PER_M * x +
    SWELL_M * Math.cos(along * Math.PI * 2 * SWELL_CYCLES + SWELL_PHASE) + fault
}
