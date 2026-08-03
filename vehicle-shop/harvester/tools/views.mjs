// vehicle-shop/harvester/tools/views.mjs
// The named camera viewpoints, shared by shoot.mjs's still-capture path and
// its --motion pair path, so a view name means the same azimuth/elevation/
// distance in both. Split out of shoot.mjs (round I0) to keep that file
// under the 200-line cap once motion mode landed.
//
// azimuth 0 sits ahead of the nose looking back at the machine, 180 sits
// behind the tail, 90 is the starboard flank, elevation 90 is straight down.
// Distance is in machine lengths (OVERALL.length = 60m).
// NEGATIVE azimuths are the port side, where the sun sits (main.ts), so
// those flanks read lit; positive azimuths are the darker starboard side.
//
// Thirty views: the ten the bar and the user's eye have been using, a 30
// degree turntable sweep, plan views, high/low dramatic angles and close-
// ups. Filter with --views.
export const VIEWS = [
  // The original ten (names stable so --views hero still means hero).
  { name: 'hero', az: -42, el: 22, dist: 1.6 },
  { name: 'hero2', az: -30, el: 12, dist: 1.3 },
  { name: 'side', az: -90, el: 4, dist: 1.7 },
  { name: 'front', az: 0, el: 5, dist: 1.6 },
  { name: 'frontlow', az: 0, el: 2, dist: 0.9 },
  { name: 'rear', az: 180, el: 6, dist: 1.7 },
  { name: 'rear34', az: -135, el: 14, dist: 1.6 },
  { name: 'top', az: 0, el: 88, dist: 1.7 },
  { name: 'tracks', az: -90, el: 3, dist: 0.55 },
  { name: 'boom', az: -18, el: 5, dist: 1.0 },
  // Turntable sweep, 30 degrees apart at a mid elevation (port = negative).
  { name: 'turntable-030', az: -30, el: 18, dist: 1.5 },
  { name: 'turntable-060', az: -60, el: 18, dist: 1.5 },
  { name: 'turntable-120', az: -120, el: 18, dist: 1.5 },
  { name: 'turntable-150', az: -150, el: 18, dist: 1.5 },
  { name: 'turntable-210', az: 150, el: 18, dist: 1.5 },
  { name: 'turntable-240', az: 120, el: 18, dist: 1.5 },
  { name: 'turntable-300', az: 60, el: 18, dist: 1.5 },
  { name: 'turntable-330', az: 30, el: 18, dist: 1.5 },
  // Plan-ish views from both sides, and high 3/4s.
  { name: 'plan-port', az: -45, el: 45, dist: 1.6 },
  { name: 'plan-starboard', az: 135, el: 45, dist: 1.6 },
  { name: 'high-hero', az: -40, el: 55, dist: 1.7 },
  { name: 'high-rear', az: -140, el: 55, dist: 1.7 },
  { name: 'turn-high-030', az: -30, el: 35, dist: 1.4 },
  { name: 'turn-high-120', az: -120, el: 35, dist: 1.4 },
  // Low dramatic angles and close-ups.
  { name: 'low-flank', az: -75, el: 3, dist: 0.7 },
  { name: 'boomclose', az: -14, el: 4, dist: 0.6 },
  { name: 'cab', az: -55, el: 8, dist: 0.5 },
  { name: 'tailclose', az: 180, el: 10, dist: 0.6 },
  { name: 'deck-top', az: 0, el: 80, dist: 0.9 },
  { name: 'conveyor', az: -70, el: 14, dist: 0.7 },
]

/** --views hero,side  -> only those, in that order; empty/absent means all. */
export function filterViews(rawFilter) {
  if (!rawFilter) return VIEWS
  const names = rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  return VIEWS.filter((v) => names.includes(v.name))
}

/** Look up one named view for --motion; throws on an unknown name rather
 *  than silently shooting the wrong angle. */
export function findView(name) {
  const view = VIEWS.find((v) => v.name === name)
  if (!view) {
    throw new Error(`--motion: unknown view "${name}" (see VIEWS in tools/views.mjs)`)
  }
  return view
}
