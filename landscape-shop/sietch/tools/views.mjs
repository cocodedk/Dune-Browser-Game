// landscape-shop/sietch/tools/views.mjs
// The four R1 evidence shots the round asks for: the exact game framing,
// the same framing in clay (pure form read), and the two parallax-drift
// extremes the release adapter applies (spec.ts CAMERA_RIG comment).
// Camera Y, lookAt and FOV never change — only x and the clay flag —
// debug.ts's setCameraX()/setClay() do the rest browser-side.

export const VIEWS = [
  { name: 'rig', cameraX: 0, clay: false },
  { name: 'rig-clay', cameraX: 0, clay: true },
  { name: 'drift-left', cameraX: -3, clay: false },
  { name: 'drift-right', cameraX: 3, clay: false },
]

/** --views rig,rig-clay -> only those, in that order; empty/absent means
 *  all four. Throws on an unknown name rather than silently shooting one
 *  fewer view than asked for. */
export function filterViews(rawFilter) {
  if (!rawFilter) return VIEWS
  const names = rawFilter.split(',').map((s) => s.trim()).filter(Boolean)
  const missing = names.filter((n) => !VIEWS.some((v) => v.name === n))
  if (missing.length) throw new Error(`unknown view(s): ${missing.join(', ')} (see VIEWS in tools/views.mjs)`)
  return VIEWS.filter((v) => names.includes(v.name))
}
