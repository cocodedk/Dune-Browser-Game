// character-shop/chani/tools/views.mjs
// The seven R1 views plus the two head framings R2 adds. Six real camera
// placements, 'silhouette' (which reuses 'threequarter's placement and
// only changes render mode — a flag on that entry, not an eighth
// azimuth/elevation/distance triple), and 'headfront'/'headthreequarter'.
//
// `rig` names a lighting rig from src/lighting.ts. Bust and head framings
// take the 3-point rig and its mid-grey backdrop; everything else keeps
// R1's harness light, so the seven original views are unmoved. The rig
// FOLLOWS the camera, so "key from camera-left" is true at every framing.
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
// Head framing: a PORTRAIT LENS. 18 degrees vertical at 0.62 * heightM
// shows ~350mm of height — the same crop a 50-degree lens gives at 0.21,
// but from 1.10m instead of 0.37m. The short-lens version was captured
// first and came back a caricature: a 24mm-equivalent at arm's length
// stretches the jaw, balloons the nose and is a lie about the geometry.
// Targeted at 0.935, which is exactly PROPORTIONS.eyeLineFraction, so the
// eye line sits dead centre.
const HEAD_DIST = 0.62
const HEAD_FOV = 18
const HEAD_TARGET_Y = 0.935

export const VIEWS = [
  { name: 'front', az: 0, el: 2, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y, rig: 'full' },
  { name: 'back', az: 180, el: 2, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y, rig: 'full' },
  { name: 'left', az: -90, el: 2, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y, rig: 'full' },
  { name: 'right', az: 90, el: 2, dist: FULL_BODY_DIST, targetY: FULL_BODY_TARGET_Y, rig: 'full' },
  { name: 'threequarter', az: -45, el: 9, dist: THREEQUARTER_DIST, targetY: FULL_BODY_TARGET_Y, rig: 'full' },
  { name: 'bust', az: -45, el: 6, dist: BUST_DIST, targetY: BUST_TARGET_Y, rig: 'bust' },
  // silhouette shares 'threequarter's placement exactly — see the header.
  { name: 'silhouette', az: -45, el: 9, dist: THREEQUARTER_DIST, targetY: FULL_BODY_TARGET_Y, silhouette: true, rig: 'full' },
  { name: 'headfront', az: 0, el: 3, dist: HEAD_DIST, targetY: HEAD_TARGET_Y, rig: 'bust', fov: HEAD_FOV },
  { name: 'headthreequarter', az: -40, el: 5, dist: HEAD_DIST, targetY: HEAD_TARGET_Y, rig: 'bust', fov: HEAD_FOV },
]

/** --views front,bust  -> only those, in that order; empty/absent means
 *  all nine. Throws on an unknown name rather than silently shooting one
 *  fewer view than asked for. */
export function filterViews(rawFilter) {
  if (!rawFilter) return VIEWS
  const names = rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  const missing = names.filter((n) => !VIEWS.some((v) => v.name === n))
  if (missing.length) throw new Error(`unknown view(s): ${missing.join(', ')} (see VIEWS in tools/views.mjs)`)
  return VIEWS.filter((v) => names.includes(v.name))
}
