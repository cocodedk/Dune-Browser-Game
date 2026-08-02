// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt LOOP, and the thing that makes the machine look
// alive: the loop SCROLLS. Every number and every sign lives in beltPhase.ts,
// which is pure and unit-tested; this file only instantiates links and copies
// the phase maths onto their transforms.
//
// ONE CHAIN OF IDENTICAL PLATES. Pass 1 built the wrap from its own shorter
// links, and the size step where a straight link met a wrap link was the
// first thing a critic saw. Now there is a single closed chain of 74 plates
// at one pitch (spec: 2 x 29 straight + 2 x 8 wrap), and a plate FLOWS from
// the bottom run round the sprocket to the top run and back. Nothing is
// created or destroyed at a tangent, so there is no seam left to hide: the
// wrap is simply the same run, bent.
//
// The plate's own geometry — tread ridge, joint plate — is link.ts's job.

import { Group, type MeshStandardMaterial } from 'three'
import { TRACK } from '../spec'
import { buildLink, type LinkPart } from './link'
import {
  BELT_THICKNESS, LINK_COUNT, LINK_LENGTH, LINK_PITCH,
  advanceBeltPhase, linkLoopPosition, placeAlongLoop,
} from './beltPhase'

export interface BeltPart {
  group: Group
  /** Scroll the loop from this side's signed track speed. */
  update(speed: number, dt: number): void
  dispose(): void
}

export function buildBelt(
  side: 1 | -1,
  beltMaterial: MeshStandardMaterial,
  jointMaterial: MeshStandardMaterial,
): BeltPart {
  const group = new Group()
  group.name = 'belt'
  group.position.x = side * TRACK.centreX

  const links: LinkPart[] = []
  /** Metres of belt travel, modulo the loop. The entire animation. */
  let phase = 0

  for (let i = 0; i < LINK_COUNT; i++) {
    const link = buildLink(side, BELT_THICKNESS, LINK_LENGTH, LINK_PITCH, beltMaterial, jointMaterial)
    link.group.name = 'belt-link'
    group.add(link.group)
    links.push(link)
  }

  /** The only place link transforms are written. */
  const place = (): void => {
    for (let i = 0; i < LINK_COUNT; i++) {
      const at = placeAlongLoop(linkLoopPosition(i, phase))
      const g = links[i].group
      g.position.y = at.y
      g.position.z = at.z
      g.rotation.x = at.rotX
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
    },
  }
}
