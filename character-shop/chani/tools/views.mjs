// character-shop/chani/tools/views.mjs
// The seven named views the R1 harness contract requires: six real camera
// placements plus 'silhouette', which reuses 'threequarter's placement and
// only changes render mode (debug.ts's setSilhouette) — a flag on that
// entry, not an eighth azimuth/elevation/distance triple.
//
// distance AND targetY are both FRACTIONS of PROPORTIONS.heightM (mirrors
// the vehicle shops' "distance is in machine lengths" convention —
// vehicle-shop/harvester/tools/views.mjs); debug.ts's viewpoint() does the
// heightM multiplication browser-side for both, so this file never needs to
// import spec.ts into node. azimuth 0 is the face's own -Z side (front),
// negative is the figure's own LEFT flank, positive its RIGHT — the same
// "port is negative" convention vehicle-shop/harvester/tools/views.mjs
// documents. targetY 0 is the ground, 1 is the crown.

const FULL_BODY_DIST = 1.5
const BUST_DIST = 0.55
const FULL_BODY_TARGET_Y = 0.5
const BUST_TARGET_Y = 0.86
// threequarter/silhouette frame slightly wider than a pure profile so the
// figure's depth (arms swung forward of the torso plane) stays in frame.
const THREEQUARTER_DIST = FULL_BODY_DIST * 1.05

export const VIEWS = [
  { name: 'front', az: 0, el: 2, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'back', az: 180, el: 2, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'left', az: -90, el: 2, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'right', az: 90, el: 2, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'threequarter', az: -45, el: 9, dist: THREEQUARTER_DIST, targetY: FULL_BODY_TARGET_Y },
  { name: 'bust', az: -45, el: 6, dist: BUST_DIST, targetY: BUST_TARGET_Y },
  // silhouette shares 'threequarter's placement exactly — see the header.
  { name: 'silhouette', az: -45, el: 9, dist: THREEQUARTER_DIST, targetY: FULL_BODY_TARGET_Y, silhouette: true },
]

/** --views front,bust  -> only those, in that order; empty/absent means
 *  all seven. Throws on an unknown name rather than silently shooting one
 *  fewer view than asked for. */
export function filterViews(rawFilter) {
  if (!rawFilter) return VIEWS
  const names = rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  const missing = names.filter((n) => !VIEWS.some((v) => v.name === n))
  if (missing.length) throw new Error(`unknown view(s): ${missing.join(', ')} (see VIEWS in tools/views.mjs)`)
  return VIEWS.filter((v) => names.includes(v.name))
}
