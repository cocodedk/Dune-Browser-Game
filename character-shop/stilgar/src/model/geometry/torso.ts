// character-shop/stilgar/src/model/geometry/torso.ts
// Pelvis, waist (spine) and chest/ribcage masses plus small shoulder caps
// that round the arm socket — see proportions.ts's shoulderR comment for
// why they stay subtle (the shoulder WRAP, geometry/costume.ts, carries the
// visible shoulder-to-shoulder edge). Direct children only: armL/armR/head
// nest under 'chest' as their own armature groups and are built elsewhere
// (arm.ts, head.ts) — that separation is what lets silhouette.test.ts
// measure "shoulder width" as exactly this file's meshes, not the whole
// limb.
//
// R1 pass-3 (2026-08-05) changed the CHEST only, and only where the head
// meets it. The chest was a cone flattened by one constant depth ratio,
// which made it DEEPEST exactly where a real chest is shallowest — at the
// clavicles — and capped it with a flat 0.20 x 0.13 m disc that the neck
// rose out of the middle of. At bust framing that disc was the "angular
// stone slab" under the head. It is now a loft: deepest at mid-chest,
// narrowing in depth toward the shoulder line, and CONTINUING above it as a
// trapezius dome that closes onto the neck. Width is untouched — the
// shoulder and waist half-widths pass-2 measured are still the profile's
// own end rows, by construction.

import { Group, BufferGeometry, MeshStandardMaterial } from 'three'
import { attach, taperedGeo, ballGeo } from './primitives'
import { catmull } from './curves'
import { revolveGeo, type Pt } from './mesh'
import {
  pelvisH, spineH, chestH, pelvisHalfW, chestBottomHalfW, spineBottomHalfW,
  chestTopHalfW, torsoDepthRatio, shoulderR,
} from '../proportions'
import { PROPORTIONS } from '../../spec'

export interface TorsoGroups {
  pelvis: Group
  spine: Group
  chest: Group
}

const flatten = (g: BufferGeometry): BufferGeometry => {
  g.scale(1, 1, torsoDepthRatio)
  return g
}

// [y, half-width, half-depth]. Rows 0 and 5 are the waist and shoulder
// half-widths pass 2 established; everything else is the depth profile and
// the trapezius above the shoulder line.
const CHEST_KEY: number[][] = [
  [0, chestBottomHalfW, chestBottomHalfW * torsoDepthRatio],
  [0.0550, 0.1690, 0.1060],
  [0.1150, 0.1820, 0.1115], // deepest — mid ribcage
  [0.1780, 0.1940, 0.1080],
  [0.2190, 0.2010, 0.0960],
  [chestH, chestTopHalfW, 0.0880], // shoulder line
  [0.2650, 0.1560, 0.0800], // trapezius
  [0.2740, 0.1180, 0.0730],
  [0.2830, 0.0850, 0.0650],
  [0.2900, 0.0640, 0.0580], // closes onto the neck (head.ts starts at 0.068)
]

function chestSurface(u: number, v: number): Pt {
  const row = catmull(CHEST_KEY, v)
  const theta = u * Math.PI * 2
  return [Math.max(0, row[1]) * Math.sin(theta), row[0], -Math.max(0, row[2]) * Math.cos(theta)]
}

/** The stillsuit-covered torso mass: pelvis block, waist taper, ribcage
 *  loft, and two shoulder-cap balls at shoulderHalfWidth. All FABRIC
 *  (stillsuit) — the wrap (costume.ts) layers ACCENT over the top. */
export function buildTorso(disposables: BufferGeometry[], groups: TorsoGroups, fabric: MeshStandardMaterial): void {
  // Pelvis: local Y spans 0..pelvisH (the pelvis GROUP's own origin sits at
  // hip-joint height, world Y=legH — matches the placeholder's convention).
  attach(
    disposables, groups.pelvis,
    flatten(taperedGeo(pelvisHalfW, pelvisHalfW * 0.9, pelvisH)),
    fabric, 0, pelvisH / 2, 0, 'pelvisMass',
  )

  // Spine/waist: local Y spans 0..spineH, narrow at the top (the torso's
  // true narrow point, continuing straight from the chest's own taper)
  // widening back out to the pelvis at the bottom.
  attach(
    disposables, groups.spine,
    flatten(taperedGeo(chestBottomHalfW, spineBottomHalfW, spineH)),
    fabric, 0, spineH / 2, 0, 'waistMass',
  )

  // Chest/ribcage plus the trapezius that carries the neck.
  attach(
    disposables, groups.chest,
    revolveGeo(chestSurface, { uSegs: 40, vSegs: 44, capBottom: true, capTop: true }),
    fabric, 0, 0, 0, 'chestMass',
  )

  // Shoulder caps: a subtle deltoid rounding at the arm socket. Flattened
  // in pass 3 (0.85 -> 0.42 in Y, dropped 14 mm) because the wrap now
  // crosses this height: at the old height they broke through the cloth as
  // two bare balls either side of the neck. Still reaches exactly
  // shoulderHalfWidth by construction (capX + shoulderR), the edge
  // silhouette.test.ts measures.
  const capX = PROPORTIONS.shoulderHalfWidth - shoulderR
  const capY = chestH - 0.014
  attach(disposables, groups.chest, ballGeo(shoulderR, 1, 0.42, 0.85), fabric, -capX, capY, 0, 'shoulderCapL')
  attach(disposables, groups.chest, ballGeo(shoulderR, 1, 0.42, 0.85), fabric, capX, capY, 0, 'shoulderCapR')
}
