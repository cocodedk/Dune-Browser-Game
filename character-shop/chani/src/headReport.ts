// character-shop/chani/src/headReport.ts
// The R2 head numbers, read off the finished vertices and folded into
// .shots/manifest.json by debug.ts so a capture carries its own
// measurements. A critic reading the manifest can check every claim in the
// round log against the same frames it describes, without running node.
//
// Every value here is MEASURED, never restated from an authoring constant.
// The landmark heights imported from face/plan.ts are measurement WINDOWS —
// "read the profile at the subnasale's own height" — exactly as the test
// files use them. This project's history includes a reported 43.2% that
// reproduced at 8%; the manifest is where that stops being possible.

import type { Object3D } from 'three'
import {
  centreProfile, frontmost, halfWidth, profilePeak, rearmost, verticesOfMesh,
  type Sample,
} from './model/measure'
import {
  bridgeGroove, exposedAperture, eyeMetrics, unmirroredVertices, type EyeMetrics,
} from './headMetrics'
import { EYE_X, EYE_Y, GONION_Y, ZYGION_Y } from './model/face/plan'

export interface HeadReport {
  /** menton-subnasale / subnasale-brow / brow-trichion, as fractions. */
  facialThirds: [number, number, number]
  chinWidth: number
  bizygomatic: number
  /** chinWidth / bizygomatic — the heart shape as one number. */
  chinOverBizygomatic: number
  bigonialOverBizygomatic: number
  eyeAperture: [number, number]
  /** How much of the aperture neither skin NOR lid buries — what is on
   *  screen — height then width. */
  eyeExposed: [number, number]
  /** Inner-canthus gap, eye-to-mouth, and lid overlap. See headMetrics.ts. */
  eye: EyeMetrics
  /** Head vertices with no exact mirror partner at -x. 0 means any
   *  one-sided feature in a capture is the key light, not the sculpt. */
  unmirrored: number
  /** Positive is a modelled groove down the nose bridge, in metres. */
  bridgeGroove: number
  browToLidGap: number
  browRelief: number
  noseProudOfUpperLip: number
  /** Upper and lower vermillion step against the lip seam. */
  vermillionStep: [number, number]
  /** The measurement that decides whether relief renders at all: mesh row
   *  spacing at the upper lip, and the worst column gap across the face. */
  rowSpacingAtLip: number
  columnGapAtLip: number
}

function mentonY(profile: number[][]): number {
  const pogonion = profilePeak(profile, 0.010, 0.034, 'front')
  let best = pogonion[0]
  for (const [y, z] of profile) if (z < pogonion[1] + 0.020 && y < best) best = y
  return best
}

function trichionY(hair: Sample[], skull: Sample[]): number {
  for (let y = 0.150; y < 0.215; y += 0.001) {
    const near = (s: Sample): boolean => Math.abs(s.x) < 0.012 && Math.abs(s.y - y) < 0.006
    const h = hair.filter(near)
    const k = skull.filter(near)
    if (!h.length || !k.length) continue
    if (Math.min(...h.map((s) => s.z)) < Math.min(...k.map((s) => s.z))) return y
  }
  return NaN
}

const spanOf = (s: Sample[], k: 'x' | 'y'): number =>
  Math.max(...s.map((v) => v[k])) - Math.min(...s.map((v) => v[k]))

/** Mesh row spacing at the UPPER LIP and the worst column gap across the
 *  face at the SEAM. Both probe heights rose 6mm with plan.ts STOMION_Y —
 *  they are windows onto the mouth, and left where they were they would
 *  have been reporting the sampling density of the chin. */
function sampling(skull: Sample[]): [number, number] {
  const rows = [...new Set(skull.map((s) => Math.round(s.y * 1e6) / 1e6))].sort((a, b) => a - b)
  let best = Infinity; let at = 0
  rows.forEach((r, i) => { if (Math.abs(r - 0.0570) < best) { best = Math.abs(r - 0.0570); at = i } })
  const rowGap = (rows[Math.min(at + 1, rows.length - 1)] - rows[Math.max(at - 1, 0)]) / 2
  const band = skull
    .filter((s) => Math.abs(s.y - 0.0525) < 0.0012 && s.z < -0.03)
    .map((s) => s.x).sort((a, b) => a - b)
  let gap = 0
  for (let i = 1; i < band.length; i++) gap = Math.max(gap, band[i] - band[i - 1])
  return [rowGap, gap]
}

export function headReport(root: Object3D): HeadReport | null {
  const part = root.getObjectByName('head')
  if (!part) return null
  const skull = verticesOfMesh(part, 'skull')
  const profile = centreProfile(skull, -0.020, 0.215, 0.001)
  const menton = mentonY(profile)
  const face = trichionY(verticesOfMesh(part, 'hairCrown'), skull) - menton
  // EVERY MOUTH WINDOW ROSE WITH plan.ts STOMION_Y (+6.5mm) and the nose
  // window's floor rose with it, because a 6.5mm-higher upper lip projects
  // 17mm at y = 60 and would otherwise be scanned as the nose tip. The
  // subnasale window narrowed to 60-72mm for the same reason: it looks for
  // the profile's rearmost point, and the lip SEAM is now inside the old
  // 50-70mm window and is also a recess.
  const subnasale = profilePeak(profile, 0.060, 0.072, 'back')[0]
  const brow = frontmost(skull, { yMin: 0.119, yMax: 0.140, axMin: 0.024, axMax: 0.038 })
  const socket = rearmost(skull, {
    yMin: EYE_Y - 0.004, yMax: EYE_Y + 0.004,
    axMin: EYE_X - 0.006, axMax: EYE_X + 0.004, zMax: 0,
  })
  const biz = 2 * halfWidth(skull, ZYGION_Y - 0.006, ZYGION_Y + 0.006)
  const chin = 2 * halfWidth(skull, menton + 0.004, menton + 0.010)
  const eye = verticesOfMesh(part, 'eyeR')
  const tip = profilePeak(profile, 0.070, 0.100, 'front')
  const upperLip = profilePeak(profile, 0.053, 0.0625, 'front')
  const lowerLip = profilePeak(profile, 0.041, 0.050, 'front')
  const seam = profilePeak(profile, 0.0495, 0.0555, 'back')
  const [rowSpacingAtLip, columnGapAtLip] = sampling(skull)

  return {
    facialThirds: [
      (subnasale - menton) / face,
      (brow.y - subnasale) / face,
      (menton + face - brow.y) / face,
    ],
    chinWidth: chin,
    bizygomatic: biz,
    chinOverBizygomatic: chin / biz,
    bigonialOverBizygomatic:
      (2 * halfWidth(skull, GONION_Y - 0.004, GONION_Y + 0.004)) / biz,
    eyeAperture: [spanOf(eye, 'x'), spanOf(eye, 'y')],
    eyeExposed: exposedAperture(eye, [
      skull, verticesOfMesh(part, 'lidUpperR'), verticesOfMesh(part, 'lidLowerR'),
    ]),
    eye: eyeMetrics(part, seam[0]),
    unmirrored: unmirroredVertices(part),
    bridgeGroove: bridgeGroove(),
    browToLidGap: Math.min(...verticesOfMesh(part, 'browR').map((s) => s.y))
      - Math.max(...eye.map((s) => s.y)),
    browRelief: socket.z - brow.z,
    noseProudOfUpperLip: upperLip[1] - tip[1],
    vermillionStep: [seam[1] - upperLip[1], seam[1] - lowerLip[1]],
    rowSpacingAtLip,
    columnGapAtLip,
  }
}
