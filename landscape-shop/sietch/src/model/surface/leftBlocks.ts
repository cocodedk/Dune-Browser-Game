// landscape-shop/sietch/src/model/surface/leftBlocks.ts
// THE WALLS WERE NOT SWEPT, THEY WERE QUARRIED. Below the springing the
// Fremen took the rock out in blocks, bay by bay, and where a bay was
// never finished a broad shallow block still stands out of the wall.
// Those unfinished blocks are the named forms below.
//
// This is the third and last displaced family, and it is deliberately the
// only one that is SIDED: the left wall and the right wall carry
// different blocks at different depths and heights, because two crews
// worked them and neither copied the other. A vault whose two walls
// answer each other is architecture; a vault whose walls disagree is
// carved rock (the finding both R1 critics kept returning to).
//
// Same sign rule as bedding.ts: proud only, never recessed, so the wall's
// widest points stay exactly where FOOTPRINT puts them.

import { bump } from './curves'

export interface LeftBlock {
  /** -1 = left wall (negative X), +1 = right wall. */
  side: -1 | 1
  /** Depth into the hall as a fraction: 0 at the back wall, 1 at the mouth. */
  atT: number
  halfT: number
  /** Centre height and half-height of the block on the wall, in metres. */
  centerY: number
  halfY: number
  /** How far it stands out of the wall, in metres. */
  proudM: number
  name: string
}

export const LEFT_BLOCKS: LeftBlock[] = [
  { side: -1, atT: 0.155, halfT: 0.055, centerY: 3.4, halfY: 2.6, proudM: 0.42, name: 'left wall, first bay — abandoned mid-cut' },
  { side: -1, atT: 0.395, halfT: 0.042, centerY: 5.1, halfY: 2.1, proudM: 0.30, name: 'left wall, high block above the hearth' },
  { side: -1, atT: 0.700, halfT: 0.060, centerY: 2.6, halfY: 2.3, proudM: 0.38, name: 'left wall, the long bench nearest the mouth' },
  { side: 1, atT: 0.245, halfT: 0.048, centerY: 2.2, halfY: 1.9, proudM: 0.34, name: 'right wall, block under the tier' },
  { side: 1, atT: 0.520, halfT: 0.052, centerY: 4.2, halfY: 2.4, proudM: 0.40, name: 'right wall, the big one at mid-hall' },
  { side: 1, atT: 0.845, halfT: 0.038, centerY: 3.0, halfY: 1.7, proudM: 0.26, name: 'right wall, last block before the mouth' },
]

/**
 * Metres the wall stands proud at this depth and height.
 * @param side  -1 for the left (negative X) wall, +1 for the right.
 * @param t     Depth fraction, 0 at the back wall to 1 at the mouth.
 * @param y     World height in metres.
 */
export function blockProudAt(side: -1 | 1, t: number, y: number): number {
  let proud = 0
  for (const block of LEFT_BLOCKS) {
    if (block.side !== side) continue
    const p = block.proudM * bump(t - block.atT, block.halfT) * bump(y - block.centerY, block.halfY)
    if (p > proud) proud = p
  }
  return proud
}

/** Albedo shift where a block stands out: its face is fresher stone and
 *  catches the hearth, its undercut sits in its own shadow. 0..1 -> tone. */
export function blockToneAt(side: -1 | 1, t: number, y: number): number {
  const strongest = LEFT_BLOCKS.reduce((m, b) => Math.max(m, b.proudM), 0)
  return (blockProudAt(side, t, y) / strongest) * 0.35
}
