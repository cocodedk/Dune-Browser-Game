// character-shop/stilgar/src/model/geometry/costume.ts
// The shoulder wrap and the catchpocket tube (spec.ts COSTUME.extras).
//
// The wrap was an angular stone slab: a 12-sided prism laid across the
// shoulders with flat end caps, plus a flat-topped cone hanging off it. It
// is now one draped cloth shell — gathered narrow at the neck, spreading
// over the shoulder line, falling open down the chest in a V, with soft
// vertical gathers, a hem that hangs LOWER at the two front edges than at
// the back, and real cloth thickness at every edge (shell.ts).
//
// Columns: [y, half-width, half-depth front, half-depth back, opening
// half-angle in degrees]. LOCAL to 'chest'; its origin is the spine top and
// chestH is the shoulder line, so the top rows sit above the shoulders.

import { Group, BufferGeometry, MeshStandardMaterial, CylinderGeometry } from 'three'
import { bell, catmull, smoothTable } from './curves'
import { shellGeo } from './shell'
import type { Pt } from './mesh'
import { attach, ballGeo, taperedGeo } from './primitives'
import { chestH } from '../proportions'

const DEG = Math.PI / 180

// The opening is a shawl V: gathered wide at the neck so the beard hangs
// clear of it, closing to a narrow front seam at the hem. Held open the
// whole way down (the first pass-3 try) it stopped being a wrap at all —
// the bare stillsuit filled the chest and only two slivers of cloth showed.
const WRAP_KEY: number[][] = [
  [0.096, 0.2210, 0.1330, 0.1470, 26], // hem
  [0.130, 0.2255, 0.1330, 0.1475, 27],
  [0.166, 0.2260, 0.1320, 0.1470, 29], // widest — the visible shoulder edge
  [0.198, 0.2215, 0.1290, 0.1440, 32],
  [0.224, 0.2110, 0.1255, 0.1405, 36],
  [0.244, 0.1980, 0.1190, 0.1340, 41], // turning over the shoulder line
  [0.262, 0.1780, 0.1090, 0.1240, 45],
  [0.276, 0.1380, 0.0960, 0.1090, 47],
  [0.289, 0.1120, 0.0850, 0.0970, 49], // gathered at the neck, under the beard
]

// Front fall: how far the hem hangs BELOW its profile height, keyed on the
// angle away from the spine (0 = back, PI = front). The two front edges of
// an open wrap fall further than its back does; a hem at one constant
// height is the giveaway that a "wrap" is really a lathe.
const HEM_FALL: number[][] = [
  [0.00, 0.012], [1.00, 0.004], [1.50, -0.010],
  [1.90, -0.028], [2.30, -0.045], [3.15, -0.060],
]

const THICKNESS = 0.0104
const FOLD = 0.030
const FOLD_K = 4.5
// A gentle thickening toward the front edges, not the hood's tight roll:
// at 6.2 mm over 0.055 of u the wrap's two rim edges rendered as a pair of
// cords slung from the neck to the shoulders. Broad and shallow reads as
// cloth folded back on itself.
const ROLL = 0.0030
const ROLL_W = 0.090
// Hem wave — a hem is a cut in cloth, not a ruler line. Even in |theta|
// about the spine, so the figure stays bilaterally symmetric.
const HEM_WAVE = 0.0075
const HEM_WAVE_K = 5.3

function wrapPatch(u: number, v: number): Pt {
  const row = catmull(WRAP_KEY, v)
  const gap = Math.max(0, row[4]) * DEG
  const theta = gap + u * (Math.PI * 2 - 2 * gap)
  const c = Math.cos(theta)
  const front = (1 + c) / 2
  const swell = 1 + FOLD * Math.cos(FOLD_K * (theta - Math.PI)) * (1 - v * 0.35)
  const roll = ROLL * (bell(u, ROLL_W) + bell(1 - u, ROLL_W))
  const rx = Math.max(0, row[1]) * swell + roll
  const rz = Math.max(0, row[3] + (row[2] - row[3]) * front) * swell + roll
  const drop = 1 - v
  const wave = HEM_WAVE * Math.cos(HEM_WAVE_K * (theta - Math.PI)) * drop * drop
  const fall = smoothTable(HEM_FALL, Math.abs(theta - Math.PI), 1) * Math.pow(drop, 1.6)
  return [rx * Math.sin(theta), row[0] + fall + wave, -rz * c]
}

/** Shoulder wrap: draped cloth over the shoulder line with a front fall. */
export function buildShoulderWrap(disposables: BufferGeometry[], chest: Group, accent: MeshStandardMaterial): void {
  attach(disposables, chest, shellGeo(wrapPatch, 64, 26, THICKNESS), accent, 0, 0, 0, 'shoulderWrap')
}

const TUBE_R = 0.013
const TUBE_X = -0.055 // character's left of the chest centreline (authored)
const COLLAR_Y = chestH * 0.9
const POCKET_Y = chestH * 0.4
// Standing PROUD of the ribcage, not sunk in it: the suit surface at this
// x runs from about -0.091 at the collar to -0.104 at the pocket, so the
// tube's axis tracks that and tilts the ~6 degrees between them. Pass 2's
// straight z = -0.10 run buried the whole thing inside the torso mass.
const TUBE_TOP_Z = -0.1017
const TUBE_BOTTOM_Z = -0.1153

/** Tube-to-catchpocket: collar down to a small padded pocket mid-chest,
 *  visible through the wrap's V opening. */
export function buildTubeAndPocket(disposables: BufferGeometry[], chest: Group, accent: MeshStandardMaterial): void {
  const rise = COLLAR_Y - POCKET_Y
  const run = TUBE_TOP_Z - TUBE_BOTTOM_Z
  const tube: CylinderGeometry = taperedGeo(TUBE_R, TUBE_R * 1.08, Math.hypot(rise, run), 10)
  tube.rotateX(Math.atan2(run, rise))
  attach(disposables, chest, tube, accent, TUBE_X, (COLLAR_Y + POCKET_Y) / 2, (TUBE_TOP_Z + TUBE_BOTTOM_Z) / 2, 'stillsuitTube')

  attach(
    disposables, chest,
    ballGeo(0.034, 1.15, 1.35, 0.55),
    accent, TUBE_X, POCKET_Y, TUBE_BOTTOM_Z + 0.006, 'catchpocket',
  )
}
