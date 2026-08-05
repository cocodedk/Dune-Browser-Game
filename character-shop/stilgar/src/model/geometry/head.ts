// character-shop/stilgar/src/model/geometry/head.ts
// THE HEAD IS ONE SCULPT. Neck, jaw, chin, cheeks, temples, forehead and
// cranium are a single lofted surface swept through the control profile
// below; the face (face.ts) is a displacement OF that surface, and the
// beard (beard.ts) hangs off the same surface function so hair and skin
// cannot drift apart. Nothing about the head is an analytic primitive any
// more — pass 1 and pass 2 both proved that a skull-ball plus a jaw-ball
// plus a brow-disc plus a nose-blob reads as a snowman, not a man.
//
// Profile columns: [y, half-width, half-depth FRONT, half-depth BACK].
// Front and back depths are separate because a head is not an ellipsoid:
// the face plane is close to the axis while the occiput swings well behind
// it, and the chin projects forward from a neck that does not. They are
// blended per-angle (see headPointFrom), not switched, so the sides stay
// smooth. All coordinates are LOCAL to the 'head' armature group — see
// proportions.ts's head-plan comment.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { catmull, lookupByKey, resample } from './curves'
import { revolveGeo, type Pt } from './mesh'
import { faceWarp } from './face'
import { crownLocal, eyeLineLocal, faceHalfWidth, neckR } from '../proportions'
import { attach } from './primitives'

const HEAD_KEY: number[][] = [
  [-0.0550, 0.0680, 0.0620, 0.0660], // neck root, buried inside the trapezius
  [-0.0280, 0.0570, 0.0545, 0.0575],
  [0.0080, neckR, 0.0485, 0.0510], // narrowest point of the neck
  [0.0280, 0.0520, 0.0670, 0.0515], // chin line: the front starts to swing out
  [0.0440, 0.0605, 0.0835, 0.0560], // chin
  [0.0620, 0.0685, 0.0895, 0.0655], // jaw body
  [0.0820, 0.0740, 0.0925, 0.0780], // gonion — the wide jaw angle
  [0.1020, 0.0782, 0.0945, 0.0885], // lower cheek
  [eyeLineLocal, faceHalfWidth, 0.0958, 0.0968], // eye line, widest
  [0.1480, 0.0790, 0.0958, 0.1008], // brow band and temple
  [0.1700, 0.0765, 0.0920, 0.1020], // forehead
  [0.1900, 0.0700, 0.0845, 0.0985],
  [0.2070, 0.0575, 0.0710, 0.0860],
  [crownLocal - 0.0092, 0.0350, 0.0450, 0.0545],
  [crownLocal, 0, 0, 0], // crown apex
]

// A dense re-sample keyed on Y, so beard.ts can ask "where is the skin at
// this angle and this height?" and get exactly the surface this file
// meshes — the guarantee that hair never lets skin show through it.
const DENSE = resample(HEAD_KEY, 481)

// Sampling bias: u is warped so mesh rings crowd toward the face. The nose
// is only ~36 mm across, and at even spacing a 72-segment ring gives it
// four samples — enough to make a nose look faceted at bust framing.
const BIAS = 0.45

function thetaOf(u: number): number {
  const a = u * Math.PI * 2
  return a - BIAS * Math.sin(a)
}

function headPointFrom(theta: number, y: number, rx: number, rzF: number, rzB: number): Pt {
  const c = Math.cos(theta)
  const front = (1 + c) / 2
  const rz = Math.max(0, rzB + (rzF - rzB) * front)
  return faceWarp(Math.max(0, rx) * Math.sin(theta), y, -rz * c, c)
}

/** The skin surface at an arbitrary angle and height — beard.ts's anchor. */
export function headPointAtY(theta: number, y: number): Pt {
  const row = lookupByKey(DENSE, y)
  return headPointFrom(theta, y, row[1], row[2], row[3])
}

/** The same surface parameterised for meshing: v walks the profile table. */
export function headSurface(u: number, v: number): Pt {
  const row = catmull(HEAD_KEY, v)
  return headPointFrom(thetaOf(u), row[0], row[1], row[2], row[3])
}

export function buildHead(disposables: BufferGeometry[], head: Group, skin: MeshStandardMaterial): void {
  const geometry = revolveGeo(headSurface, { uSegs: 76, vSegs: 66, apexTop: true, capBottom: true })
  attach(disposables, head, geometry, skin, 0, 0, 0, 'headSculpt')
}
