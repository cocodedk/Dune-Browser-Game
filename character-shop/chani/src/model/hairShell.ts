// character-shop/chani/src/model/hairShell.ts
// The hair's base volume: one closed loft covering the scalp, the temples
// and the nape, sitting 18-22mm outside the skull at the sides and ~40mm
// behind it. It is the mass the curls in hairCurls.ts grow out of, and on
// its own it must already read as HAIR from every angle — a shell that
// only works once the curls are on it is a hat.
//
// The hairline is not a drawn edge. The shell's front line runs BEHIND the
// forehead below TRICHION_Y and ahead of it above, so the hair meets the
// skin where two near-tangent surfaces cross, which is soft by
// construction. R1 pass 2 intersected a sphere with a sphere and got
// exactly one hard diagonal circle for its trouble.
//
// Every number is head-local, the same frame face/plan.ts documents:
// Y = 0 is the menton, +Z the back of the skull.

import type { Group, Mesh } from 'three'
import type { ChaniMaterials } from './materials'
import { loft, type Ring } from './loft'
import { HAIR_TOP_Y } from './face/plan'

const SHELL: readonly (readonly number[])[] = [
  // y,       rx,      rzF,     rzB,     zc
  [-0.0480, 0.0640, 0.0060, 0.0940, 0.0380], // nape nub, buried inside the collar
  [-0.0180, 0.0762, 0.0180, 0.1080, 0.0360],
  [0.0220, 0.0846, 0.0300, 0.1190, 0.0330],
  [0.0620, 0.0872, 0.0430, 0.1250, 0.0300],
  // The front half-depths at these two rows were trimmed 8mm after the
  // first capture: the shell's own front line was wrapping onto the
  // cheekbone and reading as the side panel of a hood.
  [0.1000, 0.0884, 0.0300, 0.1290, 0.0270], // widest — 22mm of hair outside the temple
  [0.1400, 0.0888, 0.0520, 0.1310, 0.0230],
  // Five rows through the hairline band, not two. The crossing is the
  // hairline, and head.test.ts finds it by comparing hair vertices against
  // skin vertices at the same height — with rings 20mm apart there were no
  // vertices to compare in the 10mm that matter.
  //
  // PASS 2 RAISED THE MEASURED CROSSING FROM 180mm TO 189. The thirds came
  // out 0.324 / 0.388 / 0.288 and the forehead was the one that was short.
  // Once the brow ridge had to stay where it was — dropping it buried the
  // eye, see warp.ts — the hairline was the ONLY remaining way to lengthen
  // the upper third, because the eye line is spec'd and the subnasale had
  // already been raised as far as a nose allows. The crossing is a
  // TANGENCY, not a ring: it lands where the two front lines meet, which
  // is why these rows are authored above the height they measure at.
  // PASS 3 BROUGHT THE HAIRLINE BACK DOWN ~8mm, reversing half of pass 2's
  // raise. Pass 2 raised it because the measured thirds were 0.324 / 0.388
  // / 0.288 and the forehead was the short one; this pass fixed the middle
  // third at its own end (plan.ts STOMION_Y) and the thirds came out
  // 0.330 / 0.343 / 0.327 — so the upper third had 4 points of margin to
  // give back, and a high flat hairline over a wide brow is one of the
  // strongest male cues a portrait has. Measured after: 0.325 / 0.374 /
  // 0.300, all three still inside head.test.ts's 0.28-0.40 band.
  [0.1700, 0.0884, 0.0770, 0.1310, 0.0194], // behind the forehead
  [0.1790, 0.0876, 0.0850, 0.1300, 0.0180], // the crossing: hairline
  [0.1870, 0.0858, 0.0862, 0.1280, 0.0168],
  [0.1945, 0.0824, 0.0848, 0.1240, 0.0152], // ahead of it — hair covers
  // Rings every ~14mm through the dome instead of every 16-20. loft() runs
  // STRAIGHT between rings — there is no Catmull-Rom in it, unlike the
  // skull's sweep — so ring spacing is the dome's vertical faceting, and
  // 44 segments only ever fixed the horizontal half of the blockiness the
  // critic saw.
  [0.1980, 0.0790, 0.0862, 0.1200, 0.0142],
  [0.2060, 0.0752, 0.0842, 0.1160, 0.0130],
  [0.2130, 0.0700, 0.0800, 0.1100, 0.0122],
  [0.2200, 0.0630, 0.0718, 0.1020, 0.0112],
  [0.2270, 0.0530, 0.0640, 0.0890, 0.0106],
  // Two extra rows through the last 12mm of the dome. loft() runs STRAIGHT
  // between rings, so ring spacing IS the vertical faceting, and this is
  // where the profile turns fastest — the crown's own silhouette showed
  // flat facets at portrait framing with rings 7mm apart here.
  [0.2305, 0.0468, 0.0586, 0.0812, 0.0103],
  [0.2340, 0.0402, 0.0530, 0.0730, 0.0100],
  [0.2372, 0.0286, 0.0382, 0.0530, 0.0100],
  [HAIR_TOP_Y, 0.0000, 0.0000, 0.0000, 0.0100], // crown apex — tallest point on the figure
]

export function shellRings(): Ring[] {
  return SHELL.map(([y, rx, rzF, rzB, zc]) => ({ y, rx, rzF, rzB, zc }))
}

export function buildShell(head: Group, mat: ChaniMaterials): Mesh {
  // 44 segments, not 26. At 26 the shell's own facets measured 21mm across
  // at the crown — visible as a blocky helmet at bust framing, which is
  // exactly what the critic called it. The curls break the dome; they
  // cannot smooth the parts of it that still show between them.
  const shell = loft(shellRings(), mat.hair, 44)
  shell.name = 'hairCrown'
  head.add(shell)
  return shell
}
