// landscape-shop/cliff/tools/views.mjs
// The three R1 evidence shots: the two spec'd CAMERA_RIGS, plus a clay
// pass on the approach rig for the pure silhouette read
// (docs/gauntlet-loop.md's R1 bar: "a blind critic ... names what it
// is").

export const VIEWS = [
  { name: 'approach', rig: 'approach', clay: false },
  { name: 'landing', rig: 'landing', clay: false },
  { name: 'approach-clay', rig: 'approach', clay: true },
]

/** --views approach,landing -> only those, in that order; empty/absent
 *  means all three. Throws on an unknown name rather than silently
 *  shooting one fewer view than asked for. */
export function filterViews(rawFilter) {
  if (!rawFilter) return VIEWS
  const names = rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  const missing = names.filter((n) => !VIEWS.some((v) => v.name === n))
  if (missing.length) throw new Error(`unknown view(s): ${missing.join(', ')} (see VIEWS in tools/views.mjs)`)
  return VIEWS.filter((v) => names.includes(v.name))
}
