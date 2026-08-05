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

export const VIEWS = [
  { name: 'front', az: 0, el: 4, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'back', az: 180, el: 4, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'left', az: -90, el: 4, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'right', az: 90, el: 4, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'threequarter', az: -40, el: 10, dist: THREEQUARTER_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'bust', az: -25, el: 10, dist: BUST_DIST, targetY: BUST_TARGET_Y },
  // silhouette shares 'threequarter's placement exactly — see the header.
  { name: 'silhouette', az: -40, el: 10, dist: THREEQUARTER_DIST, targetY: FULL_BODY_TARGET_Y, silhouette: true },
]

/** --views front,bust  -> only those, in that order; empty/absent means all
 *  seven. Throws on an unknown name rather than silently shooting one fewer
 *  view than asked for. */
export function filterViews(rawFilter) {
  if (!rawFilter) return VIEWS
  const names = rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  const missing = names.filter((n) => !VIEWS.some((v) => v.name === n))
  if (missing.length) throw new Error(`unknown view(s): ${missing.join(', ')} (see VIEWS in tools/views.mjs)`)
  return VIEWS.filter((v) => names.includes(v.name))
}
