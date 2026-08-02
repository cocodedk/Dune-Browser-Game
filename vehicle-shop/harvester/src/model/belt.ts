// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt LOOP made entirely of chain links, and the thing
// that makes the machine look alive: the loop SCROLLS. Every number and every
// sign lives in beltPhase.ts, which is pure and unit-tested; this file only
// instantiates links and copies the phase maths onto their transforms.
//
//   - BOTTOM RUN — 29 links, on the sand, travelling +Z at forward drive
//   - 2 x WRAP   — 15 links each, touching, so the arc reads as a curve
//   - TOP RUN    — 29 links returning -Z under the housing
//   - engagement lugs on every third wrap link, 36 deg apart, meshing with
//     the sprocket's five teeth and turning at exactly the sprocket's rate
//
// The straight runs overlap half a wrap-pitch INTO each arc, which both
// closes the old visible gap at the tangents and hides the one point where a
// link is handed from run to wrap (see beltPhase.ts for why a handover is
// unavoidable once the two densities differ).

import { BoxGeometry, Group, Mesh, type MeshStandardMaterial } from 'three'
import { TRACK } from '../spec'
import { buildLink, type LinkPart } from './link'
import {
  BELT_THICKNESS, BOTTOM_RUN_Y, TOP_RUN_Y, STRAIGHT_COUNT, WRAP_COUNT,
  STRAIGHT_LINK_LENGTH, WRAP_LINK_LENGTH,
  advanceBeltPhase, bottomRunZ, topRunZ, wrapPlacement, zeroBeltPhase,
  type BeltPhase,
} from './beltPhase'

export interface BeltPart {
  group: Group
  /** Scroll the loop from this side's signed track speed. */
  update(speed: number, dt: number): void
  dispose(): void
}

interface Wrap {
  sprocketZ: number
  zSign: 1 | -1
  links: Group[]
}

/** A lug on every third wrap link: 15 links over 180 degrees is one every 12
 *  degrees, so every third is one every 36 — the sprocket's tooth pitch. The
 *  teeth start half a pitch away (tracks.ts), so lugs sit BETWEEN teeth, and
 *  since belt and sprocket turn at the same rate they stay there. */
const LUG_EVERY = 3
/** Shallow on purpose. A lug rides the belt's OUTER face, and the outer face
 *  of the bottom of a wrap IS the ground line, so a deep lug would hang half a
 *  metre under the sand as it came round. This one grazes it — a grouser
 *  biting in — and still stands proud of the belt where the teeth mesh. */
const LUG_RADIAL = 0.3
/** Same X station as the sprocket teeth, so the two mesh in one plane. */
const LUG_X = TRACK.belt.width / 2 + 0.55

export function buildBelt(
  side: 1 | -1,
  beltMaterial: MeshStandardMaterial,
): BeltPart {
  const group = new Group()
  group.name = 'belt'
  group.position.x = side * TRACK.centreX

  const links: LinkPart[] = []
  const bottomRun: Group[] = []
  const topRun: Group[] = []
  const wraps: Wrap[] = []
  let phase: BeltPhase = zeroBeltPhase()

  const addRun = (name: string, y: number, into: Group[]): void => {
    for (let i = 0; i < STRAIGHT_COUNT; i++) {
      const link = buildLink(side, BELT_THICKNESS, STRAIGHT_LINK_LENGTH, beltMaterial)
      link.group.name = name
      link.group.position.y = y
      group.add(link.group)
      links.push(link)
      into.push(link.group)
    }
  }

  addRun('belt-link-bottom', BOTTOM_RUN_Y, bottomRun)
  addRun('belt-link-top', TOP_RUN_Y, topRun)

  // The lug block is one geometry shared by all ten lug meshes.
  const lugGeometry = new BoxGeometry(1.2, LUG_RADIAL, WRAP_LINK_LENGTH * 0.8)

  for (const [index, sprocketZ] of TRACK.sprocketZ.entries()) {
    // zSign points the arc's belly AWAY from the machine's centre: nose-ward
    // at the front sprocket, tail-ward at the rear.
    const zSign: 1 | -1 = index === 0 ? -1 : 1
    const wrapLinks: Group[] = []
    for (let i = 0; i < WRAP_COUNT; i++) {
      const link = buildLink(side, BELT_THICKNESS, WRAP_LINK_LENGTH, beltMaterial)
      link.group.name = 'belt-link-wrap'
      if (i % LUG_EVERY === 0) {
        const lug = new Mesh(lugGeometry, beltMaterial)
        // Local +Y is radially INWARD on a wrap link, so the lug rides out on
        // -Y: it sits proud of the belt's outer face where the teeth are.
        lug.position.set(side * LUG_X, -(BELT_THICKNESS + LUG_RADIAL) / 2, 0)
        lug.castShadow = true
        link.group.add(lug)
      }
      group.add(link.group)
      links.push(link)
      wrapLinks.push(link.group)
    }
    wraps.push({ sprocketZ, zSign, links: wrapLinks })
  }

  /** The only place link transforms are written. */
  const place = (): void => {
    for (let i = 0; i < STRAIGHT_COUNT; i++) {
      bottomRun[i].position.z = bottomRunZ(i, phase)
      topRun[i].position.z = topRunZ(i, phase)
    }
    for (const wrap of wraps) {
      for (let i = 0; i < WRAP_COUNT; i++) {
        const at = wrapPlacement(i, phase, wrap.sprocketZ, wrap.zSign)
        wrap.links[i].position.y = at.y
        wrap.links[i].position.z = at.z
        wrap.links[i].rotation.x = at.rotX
      }
    }
  }

  place()

  return {
    group,
    update(speed, dt) {
      phase = advanceBeltPhase(phase, speed, dt)
      place()
    },
    dispose() {
      for (const link of links) link.dispose()
      lugGeometry.dispose()
    },
  }
}
