// vehicle-shop/ornihopter/src/interior/flankPaneFrame.ts
// The CABIN side of the Apache side panes: the reveal that fences the opening
// and the inner pane that closes it.
//
// cabinShellWall.ts stops emitting liner between the sill and header lines
// over the window run (model/geometry/flankWindow.ts owns both), which leaves
// a rectangle of nothing between the cabin and the desert. Two things close
// it, and the round-6b lesson canopyRoof.ts states once applies to both: two
// surfaces that merely SHARE an edge are not watertight to a ray that grazes
// it, so everything here OVERLAPS.
//
//   THE REVEAL   four plates standing perpendicular to the flank along the
//                opening's four edges, running from well inboard of the liner
//                to just outboard of the skin. The liner sits HULL_INSET
//                (0.05m) inboard of the skin, so without these a shallow ray
//                could run up the slot between liner and skin and out through
//                the cut. Same defect, same fix, as the roof aperture's own
//                reveal.
//   THE PANE     one transparent plate per bay, offset inboard of the skin and
//                extended PANE_OVERLAP past the opening at all four edges, so
//                it laps the reveal instead of butting it. The outer glass
//                (model/geometry/flankGlazing.ts) is the other half of the
//                pair: stacked, they give the same brightness step through the
//                flank that round 9a tuned through the deck.

import { Group } from 'three'
import { flankWindowEdgeAt } from '../model/geometry/flankWindow'
import { FLANK_OPENINGS, type FlankOpening } from '../model/geometry/flankOpenings'
import { hullZSamples } from './hullSection'
import { flatQuad, type Placed } from './sceneUtils'
import { innerGlazingMaterial, machinedDarkMaterial } from './materials'

/** How far inboard of the skin the cabin-side pane hangs. The liner is 0.05
 *  inboard, so this leaves the pane 0.03 clear of it — glass in front of the
 *  frame, not coincident with it. */
const PANE_INSET = 0.08
/** How far the pane runs PAST the opening on every edge. */
const PANE_OVERLAP = 0.11
/** Reveal plate: from this far inboard of the skin to this far outboard. */
const REVEAL_IN = 0.16
const REVEAL_OUT = 0.02

type Sign = 1 | -1
const at = (x: number, y: number, z: number): Placed => ({ x, y, z })

interface Edge {
  lowX: number
  lowY: number
  highX: number
  highY: number
}

/** The opening at z, extended along its own edge by `grow` metres at each end
 *  — the pane's corners, or the reveal's, from the same source of truth. */
function edgeAt(z: number, grow: number): Edge | null {
  const edge = flankWindowEdgeAt(z)
  if (!edge) return null
  const dx = edge.high.x - edge.low.x
  const dy = edge.high.y - edge.low.y
  const length = Math.hypot(dx, dy) || 1
  const ux = (dx / length) * grow
  const uy = (dy / length) * grow
  return {
    lowX: edge.low.x - ux,
    lowY: edge.low.y - uy,
    highX: edge.high.x + ux,
    highY: edge.high.y + uy,
  }
}

/** Sampling across one opening: fine enough that the pane traces the hull's
 *  rake rather than chording across it, ends included exactly. */
function stations(o: FlankOpening): number[] {
  return hullZSamples(o.foreZ, o.aftZ, 0.4)
}

function pane(group: Group, sign: Sign, za: number, zb: number): void {
  const a = edgeAt(za, PANE_OVERLAP)
  const b = edgeAt(zb, PANE_OVERLAP)
  if (!a || !b) return
  const material = innerGlazingMaterial()
  group.add(
    flatQuad(
      at(sign * (a.lowX - PANE_INSET), a.lowY, za),
      at(sign * (a.highX - PANE_INSET), a.highY, za),
      at(sign * (b.highX - PANE_INSET), b.highY, zb),
      at(sign * (b.lowX - PANE_INSET), b.lowY, zb),
      material
    )
  )
}

/** Sill and header reveals over one bay: plates perpendicular to the flank. */
function sillAndHeader(group: Group, sign: Sign, za: number, zb: number): void {
  const a = edgeAt(za, 0)
  const b = edgeAt(zb, 0)
  if (!a || !b) return
  const material = machinedDarkMaterial()
  const plate = (aX: number, aY: number, bX: number, bY: number): void => {
    group.add(
      flatQuad(
        at(sign * (aX - REVEAL_IN), aY, za),
        at(sign * (aX + REVEAL_OUT), aY, za),
        at(sign * (bX + REVEAL_OUT), bY, zb),
        at(sign * (bX - REVEAL_IN), bY, zb),
        material
      )
    )
  }
  plate(a.lowX, a.lowY, b.lowX, b.lowY)
  plate(a.highX, a.highY, b.highX, b.highY)
}

/** Fore and aft jambs: the same plate, standing across the opening's ends. */
function jamb(group: Group, sign: Sign, z: number): void {
  const e = edgeAt(z, PANE_OVERLAP)
  if (!e) return
  group.add(
    flatQuad(
      at(sign * (e.lowX - REVEAL_IN), e.lowY, z),
      at(sign * (e.lowX + REVEAL_OUT), e.lowY, z),
      at(sign * (e.highX + REVEAL_OUT), e.highY, z),
      at(sign * (e.highX - REVEAL_IN), e.highY, z),
      machinedDarkMaterial()
    )
  )
}

/** One flank's reveals and inner glazing — every opening in it
 *  (flankOpenings.ts), each fenced on all four edges. ROUND 15 added the
 *  quarter pane forward of the window post; it is the same four calls, which
 *  is the point of iterating the list rather than naming a run. */
export function buildFlankPane(sign: Sign): Group {
  const group = new Group()
  group.name = sign === -1 ? 'flank-pane-pilot' : 'flank-pane-copilot'
  for (const o of FLANK_OPENINGS) {
    const zs = stations(o)
    for (let i = 0; i < zs.length - 1; i++) {
      pane(group, sign, zs[i], zs[i + 1])
      sillAndHeader(group, sign, zs[i], zs[i + 1])
    }
    jamb(group, sign, o.foreZ)
    jamb(group, sign, o.aftZ)
  }
  return group
}
