// character-shop/duncan/tools/views.mjs
// The seven named views the R1 harness contract requires: six real camera
// placements plus 'silhouette', which reuses 'threequarter's placement and
// only flips render mode (debug.ts's setSilhouette) — a flag on that entry,
// not an eighth azimuth/elevation/distance triple that could quietly drift
// from threequarter's own numbers.
//
// dist and targetY are both MULTIPLES of PROPORTIONS.heightM — debug.ts's
// viewpoint() does the heightM multiplication browser-side, so this file
// never needs to import spec.ts into node. Mirrors the vehicle shops'
// "distance is in machine lengths" convention (vehicle-shop/harvester/
// tools/views.mjs, read as reference only). azimuth 0 is the face's own -Z
// side (front), negative is the figure's own LEFT flank, positive its
// RIGHT (src/debug.ts's viewpoint() convention).

const FULL_BODY_DIST = 1.55
const FULL_BODY_TARGET_Y = 0.50
// Pulled back from a first attempt at 0.38: that close, the ribcage's own
// flat top cap (where the narrower neck cylinder sits on it) reads as a
// dominant tabletop plane rather than shoulder context — a close-up
// artifact of stacked-cylinder torso massing, not a proportions problem
// (measured correctness lives in proportions.test.ts, not this framing).
const BUST_DIST = 0.46
const BUST_TARGET_Y = 0.94
// Slightly wider than a pure profile so the arms (angled out from the
// body) and the rig's front bulk stay inside the frame.
const THREEQUARTER_DIST = FULL_BODY_DIST * 1.08

// R2's two head framings. The head is 251mm crown to chin and sits centred
// on 0.928 of stature; at a 50-degree vertical FOV a distance of 0.20
// heights frames 0.36m of subject, so chin to topknot fills the frame with
// a little air. Both carry `portrait`, which swaps in lighting.ts's
// three-point rig and its mid-grey backdrop — the bust does too, and those
// three framings are the ONLY ones that do. The six survey views and the
// silhouette keep R1's lighting and backdrop untouched, so their evidence
// stays comparable round to round.
const HEAD_DIST = 0.20
const HEAD_TARGET_Y = 0.928

export const VIEWS = [
  { name: 'front', az: 0, el: 4, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'back', az: 180, el: 4, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'left', az: -90, el: 4, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'right', az: 90, el: 4, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'threequarter', az: -40, el: 10, dist: THREEQUARTER_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'bust', az: -25, el: 10, dist: BUST_DIST, targetY: BUST_TARGET_Y, portrait: true },
  { name: 'headfront', az: 0, el: 3, dist: HEAD_DIST, targetY: HEAD_TARGET_Y, portrait: true },
  { name: 'headthreequarter', az: -35, el: 6, dist: HEAD_DIST, targetY: HEAD_TARGET_Y, portrait: true },
  // silhouette shares 'threequarter's placement exactly — see the header.
  { name: 'silhouette', az: -40, el: 10, dist: THREEQUARTER_DIST, targetY: FULL_BODY_TARGET_Y, silhouette: true },
]

/** The three-point numbers, mirrored from lighting.ts so shoot.mjs can write
 *  them into .shots/manifest.json without importing TypeScript into node.
 *  If lighting.ts's PORTRAIT changes, change this too — the manifest is
 *  evidence, and evidence that lies about its own lighting is worse than no
 *  manifest at all. */
export const PORTRAIT_RIG = {
  note: 'azimuths are OFFSETS from the camera; see src/lighting.ts',
  key: { az: 45, el: 30, intensity: 1.15 },
  fill: { az: -60, el: 12, intensity: 0.38 },
  rim: { az: 180, el: 42, intensity: 1.05 },
  ambient: 0.24,
  backdrop: '0x8a8a8a',
}

/** --views front,bust  -> only those, in that order; empty/absent means all
 *  nine. Throws on an unknown name rather than silently shooting one fewer
 *  view than asked for. */
export function filterViews(rawFilter) {
  if (!rawFilter) return VIEWS
  const names = rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  const missing = names.filter((n) => !VIEWS.some((v) => v.name === n))
  if (missing.length) throw new Error(`unknown view(s): ${missing.join(', ')} (see VIEWS in tools/views.mjs)`)
  return VIEWS.filter((v) => names.includes(v.name))
}
