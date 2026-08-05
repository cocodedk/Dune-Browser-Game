// character-shop/stilgar/tools/views.mjs
// The seven named views R1's harness requires (character-shop/docs/
// gauntlet-loop.md): front, back, left, right, threequarter (3/4 front-
// left), bust (head+shoulders framing) and silhouette (threequarter's own
// camera, all meshes pure black on white). az/el/dist/targetYFrac feed
// debug.ts's viewpoint() — dist is in FIGURE HEIGHTS, not metres.
//
// azimuth 0 sits ahead of the face looking back (the face-toward -Z
// convention every character-shop rig guards from R0), 180 sits behind,
// 90 is the figure's own RIGHT flank, -90 its LEFT — mirrors
// vehicle-shop/harvester/tools/views.mjs's az=0-ahead-of-the-nose
// convention. targetYFrac is a fraction of heightM: 0.52 aims a hair above
// true mid-height (a classic full-body "aim at the sternum" framing), 0.93
// aims near the eye line for the close bust crop.
export const VIEWS = [
  { name: 'front', az: 0, el: 10, dist: 1.5, targetYFrac: 0.52 },
  { name: 'back', az: 180, el: 10, dist: 1.5, targetYFrac: 0.52 },
  // -100/100, not a pure +-90 profile: the A-pose arm swings entirely
  // within the XY plane (a Z-axis rotation — see debug.ts/arm.ts), so an
  // exact 90-degree side camera looks straight down that swing and puts
  // the near-side arm directly in front of the torso, hiding it. Found
  // empirically (2026-08-05).
  { name: 'left', az: -100, el: 10, dist: 1.5, targetYFrac: 0.52 },
  { name: 'right', az: 100, el: 10, dist: 1.5, targetYFrac: 0.52 },
  { name: 'threequarter', az: -45, el: 14, dist: 1.5, targetYFrac: 0.52 },
  { name: 'bust', az: -20, el: 6, dist: 0.4, targetYFrac: 0.93 },
  // Same camera as threequarter — see file header.
  { name: 'silhouette', az: -45, el: 14, dist: 1.5, targetYFrac: 0.52, silhouette: true },
]

/** --views front,left -> only those, in that order; empty/absent means all. */
export function filterViews(rawFilter) {
  if (!rawFilter) return VIEWS
  const names = rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  return VIEWS.filter((v) => names.includes(v.name))
}

/** Look up one named view; throws on an unknown name rather than silently
 *  shooting the wrong angle. */
export function findView(name) {
  const view = VIEWS.find((v) => v.name === name)
  if (!view) {
    throw new Error(`unknown view "${name}" (see VIEWS in tools/views.mjs)`)
  }
  return view
}
