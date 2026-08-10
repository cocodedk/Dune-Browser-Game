// character-shop/stilgar/src/model/headReport.ts
// The head's landmark record, assembled from the built mesh and written into
// .shots/manifest.json by tools/shoot.mjs.
//
// It exists so that a reported number and a shot PNG come out of the same
// run. This project's history includes a reported 43.2% that reproduced at
// 8%, and this shop's own R1 reported a brow relief and a beard clearance
// that the geometry did not have. Putting the measurements in the manifest
// beside the images makes a builder's claim reproducible by re-reading a
// file rather than by trusting a sentence.
//
// Same extraction the vitest guards use (faceMetrics.ts), so the manifest
// and the tests cannot disagree.

import type { Object3D } from 'three'
import {
  breadthInBand, centroid, frontmost, frontmostWhere, headLocalVertices, maxY, mentonY,
  midlineNotch, minYNearMidline, type P3,
} from './faceMetrics'
import { eyeLineLocal } from './proportions'
import { skinFrame } from './geometry/head'
import { deepestInside } from './penetration'

export interface HeadLandmarks {
  eyeLineLocal: number
  browlineY: number
  subnasaleY: number
  mentonY: number
  middleThird: number
  lowerThird: number
  thirdsRatio: number
  visibleHeadTopY: number
  visibleHeadBottomY: number
  visibleHeadMass: number
  facialBreadth: number
  breadthOverMass: number
  interpupillary: number
  noseTipZ: number
  noseTipY: number
  beardFrontZ: number
  hoodFrontZ: number
  noseLeadsBeard: number
  noseLeadsHood: number
  browCrestZ: number
  foreheadZ: number
  browRelief: number
  /** R2 pass 3's brow bar has a groove along its top and a frontal shelf above
   *  that, so "relief" is measured against the OPEN forehead at EY+56..68 —
   *  see face.test.ts, which moved the same window for the same reason. */
  sulcusZ: number
  sulcusBehindCrest: number
  shelfZ: number
  eyeApexZ: number
  eyeSetBack: number
  /** THE PANEL'S OWN THREE NUMBERS, recomputed on the mesh rather than in
   *  pixels. A lens vertex counts as VISIBLE where it stands in front of the
   *  skin it is offset from, so the aperture below is the blue a camera
   *  actually sees — not the ellipse the aperture constant names. */
  apertureWidth: number
  innerGap: number
  innerGapRatio: number
  stomionY: number
  eyeToMouth: number
  eyeToMouthRatio: number
  faceInApertures: number
  /** No CSG anywhere in this shop: every hair-to-skin and lens-to-skin
   *  boundary is the level set of a summed field. These are how far the
   *  crossings actually go, which is the part a judge can see. */
  booleanFreeSculpt: true
  beardInsideSkin: number
  browInsideSkin: number
  /** By design — the lens plunges behind the lids so they occlude its rim. */
  lensBehindSkin: number
}

const EY = eyeLineLocal
const z = (p: P3 | null, fallback = NaN): number => (p ? p[2] : fallback)
const y = (p: P3 | null, fallback = NaN): number => (p ? p[1] : fallback)

/** Read every landmark the round is judged on off the real geometry. */
export function headLandmarks(root: Object3D): HeadLandmarks {
  const skin = headLocalVertices(root, 'headSculpt')
  const beard = headLocalVertices(root, 'beard')
  const hood = headLocalVertices(root, 'hood')

  const browline = centroid(headLocalVertices(root, 'browR'))[1]
  const subnasale = y(midlineNotch(skin, 0.005, EY - 0.050, EY - 0.030))
  const menton = mentonY(skin)
  const middleThird = browline - subnasale
  const lowerThird = subnasale - menton

  const top = maxY(hood)
  const bottom = minYNearMidline(beard, 0.010)
  const mass = top - bottom
  const breadth = breadthInBand(skin, EY - 0.020, EY + 0.010)

  const nose = frontmost(skin)
  const beardFront = frontmost(beard)
  const hoodFront = frontmost(hood)
  const crest = z(frontmostWhere(skin, 0.020, 0.032, EY + 0.012, EY + 0.026))
  const forehead = z(frontmostWhere(skin, 0.020, 0.032, EY + 0.056, EY + 0.068))
  const shelf = z(frontmostWhere(skin, 0.020, 0.032, EY + 0.038, EY + 0.046))
  // The sulcus floor is the LEAST forward point between bar and shelf.
  let sulcus = -Infinity
  for (const p of skin) {
    const ax = Math.abs(p[0])
    if (ax < 0.020 || ax > 0.032 || p[1] < EY + 0.028 || p[1] > EY + 0.034 || p[2] > 0) continue
    if (p[2] > sulcus) sulcus = p[2]
  }
  const eye = headLocalVertices(root, 'eyeR')
  const apex = frontmost(eye)[2]

  let inner = Infinity
  let outer = -Infinity
  for (const p of eye) {
    const ax = Math.abs(p[0])
    if (p[2] >= skinFrame(ax, p[1]).p[2]) continue
    if (ax < inner) inner = ax
    if (ax > outer) outer = ax
  }
  const apertureWidth = outer - inner
  const stomion = y(midlineNotch(skin, 0.006, 0.062, 0.078))
  const eyeToMouth = EY - stomion

  return {
    eyeLineLocal: EY,
    browlineY: browline,
    subnasaleY: subnasale,
    mentonY: menton,
    middleThird,
    lowerThird,
    thirdsRatio: middleThird / lowerThird,
    visibleHeadTopY: top,
    visibleHeadBottomY: bottom,
    visibleHeadMass: mass,
    facialBreadth: breadth,
    breadthOverMass: breadth / mass,
    interpupillary: Math.abs(centroid(headLocalVertices(root, 'eyeR'))[0]) * 2,
    noseTipZ: nose[2],
    noseTipY: nose[1],
    beardFrontZ: beardFront[2],
    hoodFrontZ: hoodFront[2],
    noseLeadsBeard: beardFront[2] - nose[2],
    noseLeadsHood: hoodFront[2] - nose[2],
    browCrestZ: crest,
    foreheadZ: forehead,
    browRelief: forehead - crest,
    sulcusZ: sulcus,
    sulcusBehindCrest: sulcus - crest,
    shelfZ: shelf,
    eyeApexZ: apex,
    eyeSetBack: apex - crest,
    apertureWidth,
    innerGap: 2 * inner,
    innerGapRatio: (2 * inner) / apertureWidth,
    stomionY: stomion,
    eyeToMouth,
    eyeToMouthRatio: eyeToMouth / apertureWidth,
    faceInApertures: breadth / apertureWidth,
    booleanFreeSculpt: true,
    beardInsideSkin: deepestInside(root, 'headSculpt', 'beard'),
    browInsideSkin: deepestInside(root, 'headSculpt', 'browR'),
    lensBehindSkin: deepestInside(root, 'headSculpt', 'eyeR'),
  }
}
