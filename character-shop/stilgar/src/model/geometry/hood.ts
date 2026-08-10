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
import { bell, catmull, crowdWarp, lookupByKey, smoothstep } from './curves'
import { shellGeo } from './shell'
import type { Pt } from './mesh'
import { hoodTopLocal } from '../proportions'
import { attach } from './primitives'

const DEG = Math.PI / 180

// The opening is an OVAL round the face, not a slot: widest beside the
// cheekbone, closing over the forehead above and closing again below the
// jaw. Pass 3's first attempt let it stay wide all the way down, and the
// two rim edges came out as a pair of straps hanging beside the beard.
// R2 brought the arch DOWN. It closed at local 0.1960, which left 49 mm of
// unbroken lit forehead between the brow and the cloth — the single largest
// bright area in the bust framing, and it read as a high bald dome rather
// than as a hood worn low. Closing at 0.1790 puts the cloth 17 mm nearer the
// brow (still 32 mm clear of the ridge crest, so the brow shadow is intact).
// Row SPACING matters as much as row values. catmull() is index-
// parameterised, so a table that steps 300 mm, 300 mm, then 40 mm sweeps the
// surface at wildly different speeds through those rows and spikes the
// curvature between them — which rendered as a hard horizontal shading band
// straight across the hood at temple height. The spacing below decreases
// smoothly from 280 mm at the hem to 118 mm at the peak; no step is more
// than about 15% off its neighbour.
// R2 pass 3 WIDENS THE FACE OPENING, and the reason is a measurement rather
// than a taste call. Binning both meshes by height: the rim sat 15.2 mm INSIDE
// the skull's own half-width at y = 0.140, 19.4 mm inside at 0.148 and 28.5 mm
// inside at 0.160 — from just below the brow upward the cloth crossed in front
// of the temples and cut them off, which is exactly the "narrow-to-oval face
// under the hood" a critic keeps reporting on a face whose measured breadth
// (0.682 of visible head mass) is squarely in band. The window was the problem,
// not the head. The five rows from the cheekbone up now open 5 to 18 degrees
// further, and ARCH_K goes with them — see below, it was the binding constraint
// above the cheekbone, not this table.
const HOOD_KEY: number[][] = [
  [-0.0400, 0.1280, 0.1000, 0.1200, 40], // hem, tucked under the wrap
  [-0.0120, 0.1228, 0.1010, 0.1232, 51],
  [0.0170, 0.1160, 0.1016, 0.1228, 61],
  [0.0460, 0.1092, 0.1028, 0.1198, 69],
  [0.0740, 0.1044, 0.1048, 0.1168, 73],
  [0.1010, 0.1010, 0.1072, 0.1154, 76], // beside the cheekbone — widest
  [0.1260, 0.0990, 0.1088, 0.1152, 74],
  [0.1480, 0.0972, 0.1094, 0.1152, 68], // beside the brow — temples now clear
  // These two stay WIDE on purpose. The arch's closure is not table-driven
  // any more (see ARCH_K): a table that walks the opening angle down to zero
  // closes it at a roughly constant rate, the two rim edges converge on the
  // midline in a straight line, and the render showed a sharp widow's peak
  // cut into the cloth. ARCH_K closes it as a square root instead, which is
  // the profile of an actual arch.
  // THE FRONT DEPTHS DROP HERE, and it is the rim-to-scalp gap. Binning both
  // meshes radially about the head axis, the hood's LINING sat 4.6 mm outside
  // the scalp on the midline at y = 0.184, 7.2 mm at 0.190 and 7.0 mm at
  // 0.196 — an air gap running right across the top of the face opening, and
  // looking into an unlit cloth lining is the black band with the head's own
  // stepped top edge inside it that the panel found. The cloth now lands 1-3
  // mm INSIDE the scalp instead, which is what a hood worn low does; the
  // overlap is invisible and a gap is not.
  [0.1680, 0.0946, 0.1056, 0.1134, 56],
  [0.1860, 0.0888, 0.0984, 0.1080, 40], // the arch closes over the forehead
  [0.2020, 0.0778, 0.0876, 0.0978, 0],
  [0.2170, 0.0620, 0.0738, 0.0800, 0],
  [0.2290, 0.0398, 0.0538, 0.0546, 0],
  [hoodTopLocal, 0, 0, 0, 0], // peak — the tallest point on the figure
]

// 7.0 mm, down from 8.8. The cut edge's rim band is one cloth thickness
// wide, and that band is a big part of what read as a raised cord.
const THICKNESS = 0.0070
// Folds: a few soft vertical gathers, symmetric about the spine by
// construction (cos is even about the back), strongest at the hem where a
// hood actually bunches. Deterministic — the shoot harness must stay
// byte-identical between runs.
const FOLD = 0.048
const FOLD_K = 3.4

// THE RIM. R1 put a ROLL here — cloth swelling outward just inside the cut
// edge — and it rendered as a raised cord running down both sides of the
// face, bright against everything around it. It was diagnosed as a hem and
// treated as one; the render says otherwise. A constant-amplitude outward
// swell centred on the edge is a TUBE, and a tube lit from anywhere has a
// specular line down it, which is precisely what a cord is.
//
// R2 turns the roll inside out. Approaching the cut edge the cloth now tucks
// BACKWARD (away from camera) and pulls slightly IN, so the last centimetre
// of hood is a receding fold instead of a proud bead: it catches the key at
// a glancing angle rather than square-on, and the edge reads as the opening
// of something rather than as piping sewn onto it. The amplitude also varies
// down the opening (TUCK_TAPER), because a constant-section edge is the
// other half of why the old one read as manufactured cord.
const TUCK = 0.0086
const TUCK_W = 0.058
const TUCK_IN = 0.13
const TUCK_TAPER = 0.42

// The arch. Opening half-angle is capped at ARCH_K * sqrt(ARCH_TOP - y)
// degrees, so it holds its width almost to the top and then closes with a
// vertical tangent.
//
// 260 was the real cause of the narrow window, and the table was innocent: at
// 260 the cap computed 63.7 degrees at y = 0.1260 against the table's 66 and
// 50.7 at y = 0.1480 against the table's 50 — so from the cheekbone up it was
// the CAP setting the opening, and widening the table alone would have changed
// nothing. At 380 the cap computes 93, 74 and 51 degrees at y = 0.1260, 0.1480
// and 0.1680, which hands the opening back to the table over the face and
// still closes the last 18 mm as a square root. The apex closure is untouched:
// ARCH_TOP, ARCH_V and the row crowding that fixed pass 2's notch all stand.
const ARCH_TOP = 0.1860
const ARCH_K = 380

// THE NOTCH AT THE APEX, and why it was never a weld.
//
// shell.ts welds u=0 to u=1 wherever the two land on the same point, and it
// was doing that correctly: above ARCH_TOP the opening is zero and both edges
// sit at theta = 0. The hole was one row BELOW. An arch closes with a
// VERTICAL TANGENT — its half-width goes as sqrt(ARCH_TOP - y), so the rate
// the opening closes at is infinite at the apex — and at 30 evenly spaced
// rows the last open row still had its rim 30.9 mm off the midline while the
// next row was shut. One quad of rim band spanning 62 mm of cloth edge is
// what rendered as a black spike over the forehead.
//
// Row count alone cannot fix a sqrt: doubling the rows only shrinks the notch
// by sqrt(2), and it measured 18 mm at 60 rows. Softening the tangent instead
// (adding an epsilon under the root) narrows the whole arch and gives back
// the widow's peak this file already rejected once. So the rows go where the
// curvature is: crowded around the apex, which turns the last three into
// 11.4 mm, 4.7 mm, 0 — a converging point instead of a cliff — and leaves the
// authored arch shape untouched everywhere else.
//
// 0.6923 is ARCH_TOP's own v: it is HOOD_KEY row 9 of 14, and catmull() is
// index-parameterised, so the apex sits at 9/13 whatever the row values are.
const ARCH_V = 9 / 13
const WARP = crowdWarp(ARCH_V, 0.05, 8)

function hoodPatch(u: number, v: number): Pt {
  const row = catmull(HOOD_KEY, lookupByKey(WARP, v)[1])
  const arch = ARCH_K * Math.sqrt(Math.max(0, ARCH_TOP - row[0]))
  const gapDeg = Math.min(Math.max(0, row[4]), arch)
  const gap = gapDeg * DEG
  const theta = gap + u * (Math.PI * 2 - 2 * gap)
  const c = Math.cos(theta)
  const front = (1 + c) / 2
  const swell = 1 + FOLD * Math.cos(FOLD_K * (theta - Math.PI)) * (1 - v * 0.55)
  // The tuck belongs to an OPEN edge only; above the brow the arch has
  // closed, and anything applied there would run down the hood's centre
  // front — the one place on this mesh nobody may see a seam.
  // Faded out with a smoothstep rather than switched off at a threshold: a
  // tuck still at full amplitude on the last row before the arch closes
  // pulls the two converging edges apart and notches the hood's centre
  // front, which is exactly what the first R2 render showed.
  const open = smoothstep(14, 42, gapDeg)
  const edge = (bell(u, TUCK_W) + bell(1 - u, TUCK_W)) * open * (1 - TUCK_TAPER * v)
  const rx = Math.max(0, row[1]) * swell * (1 - TUCK_IN * edge)
  const rz = Math.max(0, row[3] + (row[2] - row[3]) * front) * swell
  return [rx * Math.sin(theta), row[0], -rz * c + TUCK * edge]
}

export function buildHood(disposables: BufferGeometry[], head: Group, accent: MeshStandardMaterial): void {
  attach(disposables, head, shellGeo(hoodPatch, 68, 64, THICKNESS), accent, 0, 0, 0, 'hood')
}
