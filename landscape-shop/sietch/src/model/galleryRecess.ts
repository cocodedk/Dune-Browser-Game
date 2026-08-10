// landscape-shop/sietch/src/model/galleryRecess.ts
// A gallery opening as a REAL punched socket: backWall.ts cuts an actual
// hole (THREE.Shape + a hole path) at cutBounds(layout), and this module
// frames that hole with four jamb pieces (left, right, lintel, sill)
// whose OUTER edges align with the cut hole and whose INNER faces define
// the clear opening spec'd by GALLERIES, plus a dark back cap closing the
// socket at its full reveal. R1.2 root-cause fix: the previous recess sat
// entirely BEHIND a solid, unbroken cap mesh, so no ray ever reached past
// the wall plane — a decal, not a cut (gauntlet-loop.md R1 critic,
// twice). Jamb/lintel/sill front faces sit PROUD_OFFSET_M ahead of the
// cap plane — never coplanar with it, the skirt's z-fight lesson
// (Sietch.ts) — so they read as real relief even head-on.

import { Group, Mesh, BoxGeometry } from 'three'
import { chamferedBoxGeometry, type CornerNicks } from './chamferedBox'
import type { PaletteMaterials } from './materials'

// >= 0.4m: must catch the hearth light as a visible rim (R1.2 spec).
export const JAMB_THICKNESS_M = 0.45
// Metres the jamb/lintel/sill front sits ahead of the cap plane, toward
// -Z (the camera) — avoids the coplanar z-fight a flush face would cause.
export const PROUD_OFFSET_M = 0.12
// A hole must sit STRICTLY inside the cap's outer boundary or earcut
// silently discards it (measured: a hole touching/crossing the y=0 floor
// edge triangulated as if the hole array were empty — no error, just a
// solid cap). Floor-level galleries (baseY=0) would otherwise cut a hole
// edge at y < 0, past the cap's own floor line, so the hole's bottom is
// clamped just inside it instead.
const FLOOR_CLEARANCE_M = 0.05

export interface GalleryLayout {
  name: string
  x: number
  baseY: number
  width: number
  height: number
}

// R3 FINAL: hand-set nicks on the two floor-level openings only — a fresh
// critic named THEM, by shape ("perfect rectangles, hard 90-degree
// corners"), never galleryRightHigh (its own carved surround has its own
// guard, dressing.test.ts, and this round does not touch it). Corners are
// the JAMB/LINTEL pair that meets at the opening's own top edge — the
// pair a hard rectangle actually reads against the dark socket behind it.
// Sizes are 0.05-0.15 m, and no two match: a matched pair of nicks is
// just a smaller rectangle, not an eroded one.
const RECESS_NICKS: Record<string, { jambLeft: CornerNicks; jambRight: CornerNicks; lintel: CornerNicks }> = {
  galleryLeftA: {
    jambLeft: { tr: 0.09 },
    jambRight: { tl: 0.13 },
    lintel: { bl: 0.07, br: 0.11 },
  },
  galleryLeftB: {
    jambLeft: { tr: 0.14 },
    jambRight: { tl: 0.06 },
    lintel: { bl: 0.12, br: 0.05 },
  },
}

/** The rectangle backWall.ts cuts from its cap Shape: the clear opening
 *  plus the jamb margin on all four sides, so the jamb pieces below fill
 *  exactly to the cut edge with no sliver of solid cap left showing. */
export function cutBounds(layout: GalleryLayout): { x0: number; x1: number; y0: number; y1: number } {
  const { x, baseY, width, height } = layout
  return {
    x0: x - width / 2 - JAMB_THICKNESS_M,
    x1: x + width / 2 + JAMB_THICKNESS_M,
    y0: Math.max(FLOOR_CLEARANCE_M, baseY - JAMB_THICKNESS_M),
    y1: baseY + height + JAMB_THICKNESS_M,
  }
}

function framePiece(
  name: string, cx: number, cy: number, w: number, h: number,
  capZ: number, recessM: number, materials: PaletteMaterials, nicks?: CornerNicks,
): Mesh {
  const depth = PROUD_OFFSET_M + recessM
  const geometry = nicks ? chamferedBoxGeometry(w, h, depth, nicks) : new BoxGeometry(w, h, depth)
  const mesh = new Mesh(geometry, materials.stoneShadow)
  mesh.name = name
  mesh.position.set(cx, cy, capZ - PROUD_OFFSET_M + depth / 2)
  return mesh
}

export function buildGalleryRecess(
  layout: GalleryLayout, capZ: number, recessM: number, materials: PaletteMaterials,
): Group {
  const { name, x, baseY, width, height } = layout
  const bounds = cutBounds(layout)
  const group = new Group()
  group.name = 'galleryRecess'

  // Left/right jambs span the ACTUAL cut height (bounds.y0..y1 — clamped
  // for a floor-level opening, see FLOOR_CLEARANCE_M) so they always
  // exactly match the hole the cap really has, with no corner gap against
  // the lintel/sill.
  const jambHeight = bounds.y1 - bounds.y0
  const jambY = (bounds.y0 + bounds.y1) / 2
  const nicks = RECESS_NICKS[name]
  group.add(framePiece(`${name}JambLeft`, x - width / 2 - JAMB_THICKNESS_M / 2, jambY, JAMB_THICKNESS_M, jambHeight, capZ, recessM, materials, nicks?.jambLeft))
  group.add(framePiece(`${name}JambRight`, x + width / 2 + JAMB_THICKNESS_M / 2, jambY, JAMB_THICKNESS_M, jambHeight, capZ, recessM, materials, nicks?.jambRight))
  group.add(framePiece(`${name}Lintel`, x, baseY + height + JAMB_THICKNESS_M / 2, width, JAMB_THICKNESS_M, capZ, recessM, materials, nicks?.lintel))

  // No sill for a floor-level opening (bounds.y0 is clamped up near
  // baseY, leaving nothing to fill) — the hall floor itself is the
  // threshold there.
  const sillHeight = baseY - bounds.y0
  if (sillHeight > 0.01) {
    group.add(framePiece(`${name}Sill`, x, (baseY + bounds.y0) / 2, width, sillHeight, capZ, recessM, materials))
  }

  // Unlit socket floor: deep, near-black by the physics of the single
  // hearth point light rather than any authored darkness.
  const backCap = new Mesh(new BoxGeometry(width, height, 0.06), materials.stoneShadow)
  backCap.name = `${name}BackCap`
  backCap.position.set(x, baseY + height / 2, capZ + recessM)
  group.add(backCap)

  return group
}
