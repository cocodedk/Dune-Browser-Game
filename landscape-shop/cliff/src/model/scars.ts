// landscape-shop/cliff/src/model/scars.ts
// Three rockfall scars, and the blocks that fell out of them.
//
// A pale patch on a cliff only means something if the eye can find where the
// missing rock went. So each scar is pinned to a REAL debris mass in the
// bake: it sits directly above that block's own x-span, it is about as wide
// as the block is wide, and it is as tall again as the block is tall. Read
// the wall and the pile together and the story is legible without a caption
// — this piece came off there, that is it lying at the foot.
//
// The anchors are looked up by name out of massifBake.json's hierarchy, so
// they follow the blocks if a later round moves them; nothing here repeats a
// coordinate the bake already knows. surfaceR2.test.ts asserts the pairing by
// measuring overlap, not by trusting this comment.

import { MASSIF_BAKE } from './massif'
import type { Point } from './weathering'

/** Debris the scars belong to. Chosen for the two rigs: the joint wedges sit
 *  in the landing rig's own frame either side of the gate, the talus block is
 *  out on the west flank where the approach rig reads the whole wall. */
export const SCAR_SOURCES = ['jointWedge0', 'jointWedge4', 'talus4'] as const

export interface Scar {
  name: string
  centreX: number
  halfWidth: number
  bottomY: number
  topY: number
  phase: number
}

function build(): Scar[] {
  return SCAR_SOURCES.map((name, i) => {
    const block = MASSIF_BAKE.hierarchy.find((mass) => mass.name === name)
    if (!block) throw new Error(`scar anchor ${name} is not in the bake`)
    const width = block.max[0] - block.min[0]
    const height = block.max[1] - block.min[1]
    const bottomY = block.max[1] + 3
    return {
      name,
      centreX: (block.min[0] + block.max[0]) / 2,
      // About as wide as the block and about as tall: a spall scar is the
      // negative of the piece that left, not a stripe. A first pass ran them
      // 2.2 block-heights tall and they measured 74 m by 34 m — a streak down
      // the wall, which is a different form entirely.
      halfWidth: width / 2,
      bottomY,
      topY: bottomY + height * 1.1,
      phase: 1.7 * i,
    }
  })
}

export const SCARS: Scar[] = build()

/** How fresh the rock at this point is, 0 to 1. Only front-facing rock can
 *  carry a scar — a spall face looks out of the wall, and painting one onto
 *  a ledge or a back slope would read as a stain. */
export function scarAt(p: Point, n: Point): number {
  let strongest = 0
  for (const scar of SCARS) {
    const span = scar.topY - scar.bottomY
    const up = (p.y - scar.bottomY) / span
    if (up < 0 || up > 1) continue
    // Wobbled edge, so the patch is a broken outline and not an ellipse.
    const halfWidth = scar.halfWidth * (1 + 0.28 * Math.sin(p.y * 0.19 + scar.phase))
    const across = Math.abs(p.x - scar.centreX) / halfWidth
    if (across >= 1) continue
    strongest = Math.max(strongest, (1 - across * across) * Math.sin(Math.PI * up))
  }
  return strongest * Math.min(1, Math.max(0, -n.z))
}
