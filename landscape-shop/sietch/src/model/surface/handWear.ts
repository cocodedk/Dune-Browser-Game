// landscape-shop/sietch/src/model/surface/handWear.ts
// WHERE THE ROCK IS POLISHED. Not "wear" in general — these are the
// specific lines a body traces through this specific hall, every one of
// them derived from geometry that already exists in the set rather than
// placed by eye:
//   - both jambs of all three galleries, shoulder height and below: you
//     put a hand on a doorway when you go through it in the dark
//   - the sill of the raised gallery, which is a step up, so it is
//     touched by hands as well as feet
//   - the right wall alongside the tier stair, at the height a climbing
//     hand runs
// Rock people touch is smoother AND slightly lighter than rock they do
// not: the roughness drop is what makes the hearth glance off it, and
// that glance is the read.

import { CAP_Z, GALLERY_LAYOUT } from '../galleryLayout'
import { JAMB_THICKNESS_M, PROUD_OFFSET_M } from '../galleryRecess'
import { clamp01, distanceToSegment3D } from './curves'

export interface TouchLine {
  a: [number, number, number]
  b: [number, number, number]
  /** Metres out from the line at which the polish has faded to nothing. */
  radius: number
  strength: number
  name: string
}

const REACH_Y_M = 2.3
const JAMB_FACE_Z = CAP_Z - PROUD_OFFSET_M

/** Both jambs of every gallery, from just above the floor to arm's reach. */
function jambLines(): TouchLine[] {
  const lines: TouchLine[] = []
  for (const gallery of GALLERY_LAYOUT) {
    const offset = gallery.width / 2 + JAMB_THICKNESS_M / 2
    for (const side of [-1, 1]) {
      const x = gallery.x + side * offset
      lines.push({
        a: [x, gallery.baseY + 0.2, JAMB_FACE_Z],
        b: [x, gallery.baseY + REACH_Y_M, JAMB_FACE_Z],
        radius: 1.05,
        strength: 1,
        name: `${gallery.name} jamb ${side < 0 ? 'left' : 'right'}`,
      })
    }
    if (gallery.baseY > 0) {
      lines.push({
        a: [gallery.x - gallery.width / 2, gallery.baseY, JAMB_FACE_Z],
        b: [gallery.x + gallery.width / 2, gallery.baseY, JAMB_FACE_Z],
        radius: 0.8,
        strength: 0.85,
        name: `${gallery.name} sill — a step up, so hands as well as feet`,
      })
    }
  }
  return lines
}

/** The right wall beside the tier stair, at climbing-hand height. The
 *  stair rises from z = -3.5 to z = -8.5 (galleryTier.ts) against a wall
 *  that sits a little under 15 m out at those depths. */
const STAIR_HAND: TouchLine = {
  a: [14.7, 1.1, -3.8],
  b: [15.1, 6.3, -8.4],
  radius: 1.3,
  strength: 0.9,
  name: 'right wall alongside the tier stair — the climbing hand',
}

export const TOUCH_LINES: TouchLine[] = [...jambLines(), STAIR_HAND]

/** 0 (untouched) to 1 (worn smooth) at a world point. */
export function handPolishAt(x: number, y: number, z: number): number {
  let polish = 0
  for (const line of TOUCH_LINES) {
    const d = distanceToSegment3D(x, y, z, line.a[0], line.a[1], line.a[2], line.b[0], line.b[1], line.b[2])
    const w = clamp01(1 - d / line.radius)
    const value = line.strength * w * w * (3 - 2 * w)
    if (value > polish) polish = value
  }
  return polish
}
