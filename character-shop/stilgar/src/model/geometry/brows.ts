// character-shop/stilgar/src/model/geometry/brows.ts
// Brow HAIR — thick, low and nearly straight, sitting on the lower slope of
// the ridge faceFields.ts carves.
//
// This is geometry rather than a darker patch of skin because the shop has
// no texture budget this round and because it is doing structural work: the
// face's whole upper half was one unbroken bright plane from the eye line to
// the hood, and a heavy dark bar across it is the single cheapest thing that
// turns a forehead into a brow. Same thickness-field construction as the
// beard, same reason — hair has a boundary where it thins to nothing, and a
// primitive has only a silhouette edge.
//
// PALETTE.hair, unchanged; spec.ts is read-only and this round authors no
// colour of its own.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { clamp, smoothTable, smoothstep } from './curves'
import { shellGeo, type Patch } from './shell'
import type { Pt } from './mesh'
import { skinFrame } from './head'
import { eyeLineLocal } from '../proportions'
import { attach } from './primitives'

const EY = eyeLineLocal

// Medial end stops 6.8 mm off the midline: heavy brows that nearly meet, and
// deliberately not a unibrow. The lateral end comes IN 4.2 mm from pass 3's
// 57.2: at that x the loft's own outward direction is 43 degrees off the
// front, so every millimetre of standoff there buys 0.7 mm of sideways reach
// — which is how a brow ends up outside the head's silhouette in a 3/4.
const IN_X = 0.0068
const OUT_X = 0.0530

// Centre line, keyed on the run from medial (0) to lateral (1). It rises
// 2 mm and falls 4 mm across its whole length — "nearly straight" is a
// shape instruction, and an arched brow would read as surprise on a face
// whose entire job is stern.
//
// R2 pass 4 LIFTS the whole band 3.5 mm and takes 6 mm out of its height,
// and the reason is measured rather than aesthetic. The upper lid margin
// orbit.ts now builds runs from the aperture rim at EY+6.2 mm to EY+9.6 mm;
// pass 3's brow band started at EY+2.7 mm, so the hair covered the entire
// lid and the render went solid black for 15.5 mm straight down from the
// ridge into the eye — brow, lid margin and lash line all one mass. The band
// now bottoms out at EY+10.6 mm, which leaves the lid its own millimetre.
const LINE: number[][] = [
  [0, EY + 0.0139], [0.26, EY + 0.0152], [0.55, EY + 0.0154],
  [0.80, EY + 0.0141], [1, EY + 0.0116],
]
// Half-height of the hair band, and the thing two renders in a row got
// wrong. Thinning the hair does nothing about the slab read: what makes two
// black rectangles is the OUTLINE, and an outline whose height barely varies
// along its run is a bar however thin it is. This table collapses the band
// to a POINT at both ends, so the silhouette is a lens — the shape a brow
// actually has — and the render has no straight edge left to read as a cut.
const HEIGHT: number[][] = [
  [0, 0.0007], [0.13, 0.0034], [0.36, 0.0048],
  [0.62, 0.0042], [0.86, 0.0024], [1, 0.0005],
]
// Fullness along the run — thickest over the inner half, tapering to a tail.
// Zero at BOTH ends now: a tip that still carries hair is a tip made of rim
// band, and a rim band one thickness wide seen end-on is the barbed spike
// three judges reported at both ends of both brows.
const FULL: number[][] = [
  [0, 0], [0.16, 0.72], [0.42, 1], [0.68, 0.74], [0.88, 0.26], [1, 0],
]
// Lateral containment. The brow follows the ridge, and past the temporal
// line the ridge turns away from camera fast; hair still standing 6 mm off
// it there projects outside the skull's own silhouette. Measured on pass 3
// at the headthreequarter camera: the off-side brow reached 1.86 mm past the
// head-plus-hood outline at EY+13 mm, which is 7 px of jagged black sticking
// out of the profile.
const REACH: number[][] = [
  [0, 1], [0.62, 1], [0.80, 0.72], [0.92, 0.34], [1, 0.10],
]

// STANDOFF. R2 pass 1 put 3.6 mm of hair on the skin under a symmetric
// sin-arch section, and the render showed exactly what that is: a flat dark
// shape painted on a forehead. Two things were wrong and only one of them was
// the height.
//
// The height is now 7.6 mm — a brow this heavy is a MASS, and a mass has a
// top plane the key can find. The section is the other half: an arch that
// tapers to nothing at BOTH edges has no surface facing down anywhere, so it
// cannot shade itself whatever its amplitude. SECTION below keeps 72% of the
// thickness at the band's lower edge, so the hair OVERHANGS the lid and the
// shell's own bottom rim becomes a wall facing the floor — which is the
// darkest thing on the face under a 30-degree key, and the ledge the eye
// needs to believe there is bone above it. The top still feathers to 6%, so
// the brow grows out of the ridge instead of ending on it.
const SECTION: number[][] = [
  [0, 0.72], [0.18, 0.94], [0.42, 1], [0.68, 0.86], [0.88, 0.44], [1, 0.06],
]

// COARSER, and deterministically so. A brow this heavy is not a smooth
// lozenge, it is three or four hair masses with the bone showing between them.
// TUFT_K is chosen odd so no lobe lands on either end of the run, and the
// modulation is a function of u alone — brows.ts builds the left brow by
// mirroring this patch with u reversed, so the pair stays bit-exactly
// symmetric whatever this does.
const TUFT = 0.13
const TUFT_K = 9.4
const HAIR = 0.0062
const LIP = 0
const THICKNESS = 0.0030
const U_SEGS = 72
const V_SEGS = 16

/** Thickness across the band, bottom edge (v=0) to top (v=1). */
function acrossBand(v: number): number {
  return smoothTable(SECTION, clamp(v, 0, 1), 1)
}

/** Cloth depth for the shell, tapered to nothing at both ends. A constant
 *  thickness leaves the two u-boundaries as rim bands one thickness wide,
 *  and a rim band seen end-on at a patch that has already thinned to a
 *  sliver is a barb — the "pinched spike tip" both ends of both brows were
 *  reported for. Tapering it makes the ends geometric POINTS instead. */
function browDepth(u: number): number {
  return THICKNESS * smoothstep(0, 0.09, u) * smoothstep(1, 0.91, u)
}

function rightBrow(u: number, v: number): Pt {
  const x = IN_X + (OUT_X - IN_X) * u
  const half = smoothTable(HEIGHT, u, 1)
  const y = smoothTable(LINE, u, 1) - half + 2 * half * v
  const coarse = 1 + TUFT * Math.cos(TUFT_K * u)
  const thick = LIP + HAIR * smoothTable(FULL, u, 1) * smoothTable(REACH, u, 1)
    * acrossBand(v) * coarse
  const frame = skinFrame(x, y)
  return [frame.p[0] + frame.nx * thick, y, frame.p[2] + frame.nz * thick]
}

/** Mirror through X with u reversed — preserves winding, and makes the pair
 *  bit-exactly symmetric. Same trick as eyes.ts. */
function mirrored(patch: Patch): Patch {
  return (u, v) => {
    const p = patch(1 - u, v)
    return [-p[0], p[1], p[2]]
  }
}

export function buildBrows(disposables: BufferGeometry[], head: Group, hair: MeshStandardMaterial): void {
  const depth = (u: number): number => browDepth(u)
  attach(disposables, head, shellGeo(rightBrow, U_SEGS, V_SEGS, depth), hair, 0, 0, 0, 'browR')
  attach(disposables, head, shellGeo(mirrored(rightBrow), U_SEGS, V_SEGS, depth), hair, 0, 0, 0, 'browL')
}
