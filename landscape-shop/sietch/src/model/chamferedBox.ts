// landscape-shop/sietch/src/model/chamferedBox.ts
// R3 FINAL: a box with one or more corners nicked off at 45 degrees, for
// galleryRecess.ts's two floor-level openings — a fresh critic read their
// jamb/lintel corners as "perfect rectangles, hard 90-degree corners...
// carved-by-hand, not machined" wants a broken edge, not a square one.
// Built as a Shape (the box's own w x h cross-section, corners cut) swept
// through `depth` by ExtrudeGeometry, then re-centred on Z so a caller
// that already positions a BoxGeometry by its centre (framePiece) needs
// no position math of its own to swap one for the other.

import { BufferGeometry, ExtrudeGeometry, Shape } from 'three'

export type Corner = 'bl' | 'br' | 'tr' | 'tl'

/** Metres each named corner is nicked. Omitted or 0 = left square. */
export type CornerNicks = Partial<Record<Corner, number>>

/**
 * @param w  Full width (local X), matches BoxGeometry's first argument.
 * @param h  Full height (local Y), matches BoxGeometry's second argument.
 * @param depth  Full depth (local Z), matches BoxGeometry's third argument.
 */
export function chamferedBoxGeometry(w: number, h: number, depth: number, nicks: CornerNicks): BufferGeometry {
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = -h / 2
  const y1 = h / 2
  const shape = new Shape()

  // Walked CCW, bl -> br -> tr -> tl. A nicked corner contributes TWO
  // points (backing off along the edge just travelled, then stepping off
  // along the edge about to be travelled) — a square one contributes its
  // single sharp vertex, never a zero-length duplicate that would leave a
  // degenerate edge for ExtrudeGeometry's triangulator to choke on.
  const points: Array<[number, number]> = []
  const add = (x: number, y: number): void => { points.push([x, y]) }
  const bl = nicks.bl ?? 0
  const br = nicks.br ?? 0
  const tr = nicks.tr ?? 0
  const tl = nicks.tl ?? 0

  if (bl > 0) { add(x0, y0 + bl); add(x0 + bl, y0) } else add(x0, y0)
  if (br > 0) { add(x1 - br, y0); add(x1, y0 + br) } else add(x1, y0)
  if (tr > 0) { add(x1, y1 - tr); add(x1 - tr, y1) } else add(x1, y1)
  if (tl > 0) { add(x0 + tl, y1); add(x0, y1 - tl) } else add(x0, y1)

  shape.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1])
  shape.closePath()

  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}
