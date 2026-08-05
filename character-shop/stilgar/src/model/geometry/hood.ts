// character-shop/stilgar/src/model/geometry/hood.ts
// THE HOOD IS CLOTH. Pass 2 built it as an open SphereGeometry with a wedge
// deleted, which is why it read as a dark balloon with a slice cut out: a
// sphere has no drape, and a deleted wedge has no edge — just a
// zero-thickness boundary that renders as a stray hairline.
//
// This is a draped shell instead. Its cross-sections are authored per
// height (taller than wide, deeper behind than in front, flaring onto the
// shoulders at the hem), its opening is an ARCH — closed over the forehead,
// widening down past the temples, wide open along the cheeks — and it is
// built through shell.ts, so the cloth has real thickness and the rim is a
// visible band of edge with a roll just inside it.
//
// Columns: [y, half-width, half-depth front, half-depth back, opening
// half-angle in degrees]. Angle 0 is dead front; 0 degrees of opening means
// the cloth closes over the face side at that height. LOCAL to 'head'.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { bell, catmull } from './curves'
import { shellGeo } from './shell'
import type { Pt } from './mesh'
import { hoodTopLocal } from '../proportions'
import { attach } from './primitives'

const DEG = Math.PI / 180

// The opening is an OVAL round the face, not a slot: widest beside the
// cheekbone, closing over the forehead above and closing again below the
// jaw. Pass 3's first attempt let it stay wide all the way down, and the
// two rim edges came out as a pair of straps hanging beside the beard.
const HOOD_KEY: number[][] = [
  [-0.0400, 0.1280, 0.1000, 0.1200, 40], // hem, tucked under the wrap
  [-0.0100, 0.1225, 0.1010, 0.1235, 50],
  [0.0250, 0.1140, 0.1015, 0.1225, 60],
  [0.0580, 0.1070, 0.1030, 0.1190, 67],
  [0.0900, 0.1025, 0.1055, 0.1158, 71],
  [0.1200, 0.0998, 0.1080, 0.1150, 71], // beside the cheekbone — widest
  [0.1480, 0.0980, 0.1095, 0.1158, 58], // beside the brow — opening narrows
  [0.1700, 0.0952, 0.1092, 0.1148, 37],
  [0.1850, 0.0906, 0.1072, 0.1108, 15], // the arch closes over the forehead
  [0.1960, 0.0846, 0.1032, 0.1046, 0],
  [0.2120, 0.0702, 0.0894, 0.0902, 0],
  [0.2280, 0.0422, 0.0570, 0.0576, 0],
  [hoodTopLocal, 0, 0, 0, 0], // peak — the tallest point on the figure
]

const THICKNESS = 0.0088
// Folds: a few soft vertical gathers, symmetric about the spine by
// construction (cos is even about the back), strongest at the hem where a
// hood actually bunches. Deterministic — the shoot harness must stay
// byte-identical between runs.
const FOLD = 0.048
const FOLD_K = 3.4
// A roll of cloth just inside the cut edge, so the opening reads as a
// turned hem rather than as a knife cut through a shell.
const ROLL = 0.0072
const ROLL_W = 0.052

function hoodPatch(u: number, v: number): Pt {
  const row = catmull(HOOD_KEY, v)
  const gap = Math.max(0, row[4]) * DEG
  const theta = gap + u * (Math.PI * 2 - 2 * gap)
  const c = Math.cos(theta)
  const front = (1 + c) / 2
  const swell = 1 + FOLD * Math.cos(FOLD_K * (theta - Math.PI)) * (1 - v * 0.55)
  // The roll belongs to an OPEN edge only; above the brow the arch has
  // closed and a roll there would be a ridge down the hood's centre front.
  const open = Math.min(1, Math.max(0, row[4]) / 8)
  const roll = ROLL * open * (bell(u, ROLL_W) + bell(1 - u, ROLL_W))
  const rx = Math.max(0, row[1]) * swell + roll
  const rz = Math.max(0, row[3] + (row[2] - row[3]) * front) * swell + roll
  return [rx * Math.sin(theta), row[0], -rz * c]
}

export function buildHood(disposables: BufferGeometry[], head: Group, accent: MeshStandardMaterial): void {
  attach(disposables, head, shellGeo(hoodPatch, 68, 30, THICKNESS), accent, 0, 0, 0, 'hood')
}
